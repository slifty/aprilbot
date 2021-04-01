const util = require('util')
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path')
const { v4: uuidv4 } = require('uuid');
const EmojiConvertor = require('emoji-js')
const streamPipeline = util.promisify(require('stream').pipeline)

var jsonfile = require('jsonfile')
var command_modules = require('./command_modules');
const execSync = require('child_process').execSync;

const { SocketModeClient, LogLevel } = require('@slack/socket-mode');
const { WebClient } = require('@slack/web-api');

const Cookies = require('./emojiUpload/Cookies')
const Emoji = require('./emojiUpload/Emoji')
const Input = require('./emojiUpload/Input')
const puppeteer = require('puppeteer')
const selectors = require('./emojiUpload/selectors')

const userToken = process.env.V2_BOT_TOKEN;
const appToken = process.env.SOCKET_TOKEN;
const socketModeClient = new SocketModeClient({
    appToken,
});
const webClient = new WebClient(userToken);

const main_channel = 'C01S87TUFGB' // test room
//var main_channel = 'C02JZTC78'; // #general

var rate_limiter = 0 // how many posts since last rate limit reset

///////////////////////////
// Set things up to save settings
var user_settings_file = 'user_settings.json'
var user_settings = {};
function load_settings() {
    if(fs.existsSync(user_settings_file)) {
        jsonfile.readFile(user_settings_file, function(err, obj) {
            if(!err) {
                user_settings = obj;
            }
        })
    }
}

function save_settings() {
    jsonfile.writeFile(user_settings_file, user_settings, {spaces: 2}, function(err) {
        if(err) {
            console.error(err);
        }
    });
}

function set_stage() {
    // Only set the stage if user settings don't exist
    if(!fs.existsSync(user_settings_file)) {
        // Give the introductory message
        send_message(main_channel, ":cats: :cats: :cats: MEOW! Happy April 1st. :cats: :cats: :cats: \n\r\
The real world is falling apart (*purrrr*), and so instead of simulating some type of digital apocalypse like we normally do around here :cat:, this year we will celebrate our quarantine by curling up :cat2: and watching a movie together.\n\r\
Please just go about your normal activities, and break out the :popcorn:! You have nothing to fur -- I mean fear.");

        user_settings['CATFRAME'] = 0
        save_settings();
    }
}

///////////////////////////
// user settings stuff
function prepUserState(userId) {
    if(!user_settings[userId]) {
        user_settings[userId] = {
            message_count: 0
        };
    }
}
function recordUserMessage(userId, text) {
    prepUserState(userId);
    user_settings[userId].message_count += 1;
    save_settings();
}

/////////////////////////////
// Load up the markov chains
var userDict = {};
var botDict = {};

function loadUsers() {
    admin_bot.getUsers().then(function(data) {
        var users = data["members"];
        for(var x in users) {
            var user = users[x];
            userDict[user.id] = user;
        }
    });
}

/////////////////////////
/// 2020 Code here
let _emojiListCache = null
const _emojiConverter = new EmojiConvertor()
_emojiConverter.replace_mode = 'img'

const blendMods = {
    // Color Mods
    'large_blue_square': ['tint', '#2461E9'],
    'large_red_square': ['tint', '#C33524'],
    'black_square': ['tint', '#040404'],
    'white_square': ['tint', '#D9D9D9'],
    'large_green_square': ['tint', '#4FAD32'],
    'large_brown_square': ['tint', '#6E4224'],
    'large_orange_square': ['tint', '#F09037'],
    'large_purple_square': ['tint', '#AA46F6'],
    'large_yellow_square': ['tint', '#E4B43D'],
    'ericidol': ['negate'],
    'newspaper': ['monochrome'],

    // Direction Mods
    'arrow_right': [],
    'arrow_up': [],
    'arrow_down': [],
    'arrow_left': [],
    'arrow_up_down': [],
    'arrows_clockwise': [],
    'arrow_upper_left': [],
    'arrow_lower_left': [],
    'arrow_lower_right': [],
    'arrow_upper_right': [],
    'left_right_arrow': ['flop'],
    'arrow_up_down': ['flip'],
    'arrow_forward': [],
    'arrow_up_small': [],
    'arrow_double_up': [],
    'arrow_down_small': [],
    'arrow_double_down': [],
    'arrow_heading_down': ['rotate', '90'],
    'arrow_heading_up': ['rotate', '-90'],
    'arrow_right_hook': [],
    'arrow_backward': [],

    // Rotate mods


    // Number Mods
    'one': ['addParameter', 1],
    'two': ['addParameter', 2],
    'three': ['addParameter', 3],
    'four': ['addParameter', 4],
    'five': ['addParameter', 5],
    'six': ['addParameter', 6],
    'seven': ['addParameter', 7],
    'eight': ['addParameter', 8],
    'nine': ['addParameter', 9],
    'zero': ['addParameter', 0],

    // Style Mods
    'cubimal_chick': [], // Justin => Fractal Pattern
}

function should_process_this_message(message) {
    return message.type == "message"
        && !message.hidden
        && !message.upload
}

async function uploadEmoji(name, filePath) {
    const cookies = await Cookies.get();
    const browser = await puppeteer.launch({
        headless: true,
    })
    const credentials = {
        email: process.env.SLACK_EMAIL,
        password: process.env.SLACK_PASSWORD,
    }

    const page = await browser.newPage()
    const files = [filePath]
    const teamname = 'thegpf'

    if (cookies) {
      // Set cookies on browser load to avoid logging in over again.
      await Cookies.restore(page);
    }

    await page.goto(`https://${teamname}.slack.com/customize/emoji`);

    // Check if we need to sign in.
    if (await page.$(selectors.LOGIN.EMAIL)) {
      await Input.type(selectors.LOGIN.EMAIL, credentials.email, page);
      await Input.type(selectors.LOGIN.PASSWORD, credentials.password, page);
      await page.click(selectors.LOGIN.SUBMIT);
      await page.waitForNavigation();
    }

    // Save new cookies after login
    Cookies.save(await page.cookies(), teamname);

    for (let i = 0; i < files.length; i++) {
      const file = path.parse(files[i]);
      console.log('Processing ' + file.base);
      try {
          await Emoji.upload(file, name, page);
      } catch (e) {}
    }

    console.log('Done');
    await browser.close();
}

function extractEmoji(message) {
    const matches = message.text.match(/\:[^\s\:]+\:/g)??[]
    return matches.map(emoji => emoji.slice(1,-1))
}

async function loadEmojiList() {
    // Use https://api.slack.com/methods/emoji.list
    // to get a list of all emoji in the app.  This should be called
    // any time there is an emoji not already in the cached list.
    //
    // We may want to add a timeout since we are full of trolls,
    // so this would only triger a request every 10 seconds or so.
    if (_emojiListCache === null) {
        const result = await webClient.emoji.list()
        _emojiListCache = result.emoji
        setTimeout(() => _emojiListCache = null, 60000)
    }
    return _emojiListCache
}

function emojiFileExists(emoji) {
    return fs.existsSync(`input_emoji/${emoji}`)
}

async function downloadEmojiFile(emoji) {
    // Download an emoji file from slack into the input_emoji directory
    const resolvedEmoji = await resolveEmoji(emoji)
    if(emojiFileExists(resolvedEmoji)) {
        return
    }
    const emojiList = await loadEmojiList()
    const destinationPath = `input_emoji/${resolvedEmoji}`
    if (resolvedEmoji in emojiList) {
        const imageUrl = emojiList[resolvedEmoji]
        // const extension = path.extname('index.html')
        const destination = fs.createWriteStream(destinationPath)
        console.log(imageUrl)
        const res = await fetch(imageUrl)
        await streamPipeline(res.body, destination)
    } else {
        // This is not a custom emoji, so we need to
        // pull it from the file in this repo https://github.com/iamcal/emoji-data
        // which should be cloned into a sibling directory to this project's root.
        // const imgTag = _emojiConverter.replace_colons(`:${resolvedEmoji}:`)
        const imgTag = _emojiConverter.replace_colons(`:${resolvedEmoji}:`)
        const srcMatch = imgTag.match(/src=".*\.png"/)
        const sourcePath = `../emoji-data/${srcMatch[0].slice(17, -1)}`
        await streamPipeline(
            fs.createReadStream(sourcePath),
            fs.createWriteStream(`${destinationPath}`)
        )
    }
}

async function resolveEmoji(emoji) {
    const emojiList = await loadEmojiList()
    if (emoji in emojiList
     && emojiList[emoji].startsWith('alias:')) {
        return emojiList[emoji].slice(6)
    } else {
        return emoji
    }
}

async function generateBlendSteps(emojis) {
    const blendSteps = await emojis.reduce(async (stepsPromise, emoji) => {
        const steps = await stepsPromise
        const resolvedEmoji = await resolveEmoji(emoji)

        // Note: the first emoji is never treated as a mod.
        if (resolvedEmoji in blendMods
         && steps.length > 0) {
            steps.push(blendMods[resolvedEmoji])
        } else {
            steps.push(['loadEmoji', resolvedEmoji])
        }
        return steps
    }, [])
    return blendSteps
}

function parameterOrDefault(parameter, value) {
    return parameter===''?value:parameter
}

function generateCommandObject(step, stepNumber, cursor, workingDirectory, workingFiles, parameter='') {
    const stepType = step[0]
    let newFile = `${workingDirectory}/${stepNumber}`
    let newWorkingFiles = [...workingFiles]
    switch (stepType) {
        case 'loadEmoji':
            // Loading a new emoji progresses the cursor to that emoji
            // Previously loaded emoji are still in the stack
            newWorkingFiles.push(newFile)
            return {
                command: `cp input_emoji/${step[1]} ${newFile}`,
                files: newWorkingFiles,
                cursor: workingFiles.length,
            }

        // color
        case 'tint':
            // Adjusting the tint of the current emoji replaces it in the stack
            newWorkingFiles.splice(cursor, 1, newFile)
            tintAmount = Math.min(255, parameterOrDefault(parameter, 100))
            return {
                command: `magick ${workingFiles[cursor]} -colorspace gray -fill '${step[1]}' -tint ${tintAmount} ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'negate':
            // invert the colors
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -negate ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
            return `magick convert ${infiles[0]} -negate ${outfile}`
        case 'monochrome':
            // transform to pure black and white (like print)
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -monochrome ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'sepia-tone':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -sepia-tone 80% ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }

        // geometry
        case 'rotate':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -rotate '${step[1]}' ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }

        case 'flip':
            // vertical flip
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -flip ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'flop':
            // horizontal flip
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -flop ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'shift-left':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +2+0 ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'shift-right':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -roll -2+0 ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'shift-up':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +0+2 ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'shift-down':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +0-2 ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }

        // animation
        case 'reverse':
            // reverse a gif
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]} -reverse ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }

        // compose

        case 'modadd':
            newWorkingFiles.splice(cursor, 2, newFile)
            const [img1, img2] = workingFiles.slice(-2)
            return {
                command: `magick ${img1} -set option:dims "%wx%h" ${img2} -resize "%[dims]" -compose ModulusAdd -composite ${newFile}`
                file: newWorkingFiles,
                cursor
            }

        case 'addParameter':
            return {
                files: newWorkingFiles,
                cursor,
                parameter: `${parameter}${step[1]}`,
            }
    }
}

async function blendEmojis(emojis) {
    await Promise.all(emojis.map(async (emoji) => { await downloadEmojiFile(emoji) }))
    const blendSteps = await generateBlendSteps(emojis)
    const workingDirectory = `tmp/${uuidv4()}`
    let parameter = ''
    let workingFiles = []
    let cursor = 0
    fs.mkdirSync(workingDirectory)
    const commandObjects = blendSteps.map((step, i) => {
        const commandObject = generateCommandObject(
            step,
            i,
            cursor,
            workingDirectory,
            workingFiles,
            parameter
        )
        workingFiles = commandObject.files
        parameter = commandObject.parameter
        cursor = commandObject.cursor
        return commandObject
    })
    commandObjects.forEach(commandObject => {
        console.log(commandObject)
        if(commandObject.command) {
            execSync(commandObject.command)
        }
    })
    // uploadEmoji('apriltest2', `${workingDirectory}/${blendSteps.length - 1}`)
}
blendEmojis(['tinkfase', 'large_green_square', 'joy', 'large_orange_square'])

///////////////////////////
// Process every message on slack
socketModeClient.on('message', async ({event, body, ack}) => {
    await ack();
    if(should_process_this_message(event)) {
        const emojis = extractEmoji(event)
        if (emojis.length === 1) {
            await webClient.reactions.add({
                channel: event.channel,
                name: emojis[0],
                timestamp: event.ts,
            })
        } else {
            const newEmoji = await blendEmojis(emojis)
            // await webClient.reactions.add({
            //     channel: event.channel,
            //     name: newEmoji,
            //     timestamp: event.ts,
            // })
        }
    }
});

(async () => {
  // Connect to Slack
  await socketModeClient.start();
  console.log("APRIL HAS STARTED!")
})();

// Set the stage
// set_stage();
//loadUsers();

// Load settings
// load_settings();

// reset rate limit every 10 seconds
// function resetRateLimit() {
//     rate_limiter = 0;
// }
// setInterval(resetRateLimit, 20000);
