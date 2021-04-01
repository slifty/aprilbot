const randomWords = require('random-words');
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
let _usedNames = []
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
    'arrow_left': ['roll-horizontal', -25],
    'arrow_right': ['roll-horizontal', 25],
    'arrow_up': ['roll-vertical', 25],
    'arrow_down': ['roll-vertical', -25],
    'arrows_clockwise': [], // rotate animation
    'arrow_upper_left': ['roll-diagonal-upper-left', -25],
    'arrow_upper_right': ['roll-diagonal-upper-right', 25],
    'arrow_lower_right': ['roll-diagonal-upper-left', 25],
    'arrow_lower_left': ['roll-diagonal-upper-right', -25],
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

    // Crop mods
    'scissors': ['crop-vertical', 50],
    'knife': ['crop-horizontal', 50],


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
    // 'cubimal_chick': [], // Justin => Fractal Pattern

    // meta mods
    'exclamation': ['regenerate'], // Always regenerate even if hash exists

    // animation mods
    'rewind': ['reverse'],
    'rainbow': ['rainbowify'],

    // combination mods
    'heavy_plus_sign': ['modadd'],
    'lower_left_paintbrush': ['blend'],
    'hourglass_flowing_sand': ['slow-left-right-transition'],
    'fence': ['slats-transition'],
    'checkered_flag': ['checkerboard-transition'],
}

function getColorFromHex(hex) {
    switch(hex) {
        case '#2461E9':
            return 'blue'
        case '#C33524':
            return 'red'
        case '#040404':
            return 'black'
        case '#D9D9D9':
            return 'white'
        case '#4FAD32':
            return 'green'
        case '#6E4224':
            return 'brown'
        case '#F09037':
            return 'orange'
        case '#AA46F6':
            return 'purple'
        case '#E4B43D':
            return 'yellow'
    }
    return 'tinted'
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

async function loadEmojiList(forced = false) {
    // Use https://api.slack.com/methods/emoji.list
    // to get a list of all emoji in the app.  This should be called
    // any time there is an emoji not already in the cached list.
    //
    // We may want to add a timeout since we are full of trolls,
    // so this would only triger a request every 10 seconds or so.
    if (_emojiListCache === null || forced === true) {
        const result = await webClient.emoji.list()
        _emojiListCache = result.emoji
        setTimeout(() => _emojiListCache = null, 5000)
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
        const res = await fetch(imageUrl)
        await streamPipeline(res.body, destination)
    } else {
        // This is not a custom emoji, so we need to
        // pull it from the file in this repo https://github.com/iamcal/emoji-data
        // which should be cloned into a sibling directory to this project's root.
        // const imgTag = _emojiConverter.replace_colons(`:${resolvedEmoji}:`)
        const imgTag = _emojiConverter.replace_colons(`:${resolvedEmoji}:`)
        const srcMatch = imgTag.match(/src=".*\.png"/)
        if(srcMatch) {
            const sourcePath = `../emoji-data/${srcMatch[0].slice(17, -1)}`
            await streamPipeline(
                fs.createReadStream(sourcePath),
                fs.createWriteStream(`${destinationPath}`)
            )
        }
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

async function generateBlendSteps(emojis, allowFirstMod=false) {
    const blendSteps = await emojis.reduce(async (stepsPromise, emoji) => {
        const steps = await stepsPromise
        const resolvedEmoji = await resolveEmoji(emoji)

        // Note: the first emoji is never treated as a mod.
        if (resolvedEmoji in blendMods
         && (steps.length > 0 || allowFirstMod === true)) {
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
        // meta
        case 'addParameter':
            // Parameters are strung together / concatinated
            return {
                files: newWorkingFiles,
                cursor,
                parameter: `${parameter}${step[1]}`,
            }

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
        case 'soft-glow':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick convert ${workingFiles[cursor]}[0] ( +clone -blur 0x3 ) -compose Lighten -composite ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'rainbowify':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `./pseudocolor -i 32 -d 8 ${workingFiles[cursor]} ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }

        // geometry
        case 'rotate':
            newWorkingFiles.splice(cursor, 1, newFile)
            rotationDegrees = parameterOrDefault(parameter, step[1]) % 360
            return {
                command: `magick convert ${workingFiles[cursor]} -rotate '${rotationDegrees}' ${newFile}`,
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
        case 'roll-horizontal':
            newWorkingFiles.splice(cursor, 1, newFile)
            rollPercent = parameterOrDefault(parameter, step[1]) % 100
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +${rollPercent}%+0 ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'roll-vertical':
            newWorkingFiles.splice(cursor, 1, newFile)
            rollPercent = parameterOrDefault(parameter, step[1]) % 100
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +0+${rollPercent}% ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'roll-diagonal-upper-left':
            newWorkingFiles.splice(cursor, 1, newFile)
            rollPercent = parameterOrDefault(parameter, step[1]) % 100
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +${rollPercent}%+${rollPercent}% ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'roll-diagonal-upper-right':
            newWorkingFiles.splice(cursor, 1, newFile)
            rollPercent = parameterOrDefault(parameter, step[1]) % 100
            return {
                command: `magick convert ${workingFiles[cursor]} -roll +${rollPercent}%-${rollPercent}% ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'squish-left':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick ${workingFiles[cursor]} -set option:dims "%wx%h" -resize 50%x100% -alpha Set -gravity West -background none -extent %[dims] ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'squish-right':
            newWorkingFiles.splice(cursor, 1, newFile)
            return {
                command: `magick ${workingFiles[cursor]} -set option:dims "%wx%h" -resize 50%x100% -alpha Set -gravity East -background none -extent %[dims] ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }

        // cropping
        case 'crop-horizontal':
            newWorkingFiles.splice(cursor, 1, newFile)
            cropPercent = parameterOrDefault(parameter, step[1]) % 100
            return {
                command: `magick convert ${workingFiles[cursor]} -crop 100%x100%x${cropPercent}%x0 ${newFile}`,
                files: newWorkingFiles,
                cursor,
            }
        case 'crop-vertical':
            newWorkingFiles.splice(cursor, 1, newFile)
            cropPercent = parameterOrDefault(parameter, step[1]) % 100
            return {
                command: `magick convert ${workingFiles[cursor]} -crop 100%x100%x0x${cropPercent}% ${newFile}`,
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
            pieces = workingFiles.slice(cursor - 1, 2)
            if (pieces.length == 2) {
                [img1, img2] = pieces
                newWorkingFiles.splice(cursor - 1, 2, newFile)
            } else {
                img1 = workingFiles[cursor]
                img2 = workingFiles[cursor]
                newWorkingFiles.splice(cursor, 1, newFile)
            }
            return {
                command: `magick ${img1} -set option:dims "%wx%h" ${img2} -resize "%[dims]" -compose ModulusAdd -composite ${newFile}`,
                files: newWorkingFiles,
                cursor: cursor - 1
            }

        case 'blend':
            pieces = workingFiles.slice(cursor - 1, 2)
            if (pieces.length == 2) {
                [img1, img2] = pieces
                newWorkingFiles.splice(cursor - 1, 2, newFile)
            } else {
                img1 = workingFiles[cursor]
                img2 = workingFiles[cursor]
                newWorkingFiles.splice(cursor, 1, newFile)
            }
            return {
                command: `magick ${img1} -set option:dims "%wx%h" ${img2} -resize "%[dims]" -compose Screen -composite ${newFile}`,
                files: newWorkingFiles,
                cursor: cursor - 1
            }

        case 'slow-left-right-transition':
            pieces = workingFiles.slice(cursor - 1, 2)
            if (pieces.length == 2) {
                [img1, img2] = pieces
                newWorkingFiles.splice(cursor - 1, 2, newFile)
            } else {
                img1 = workingFiles[cursor]
                img2 = workingFiles[cursor]
                newWorkingFiles.splice(cursor, 1, newFile)
            }
            return {
                command: `magick \\( \\( ${img1}[0] -set option:dims "%wx%h" \\) \\( +clone \\( +clone -alpha extract -colorspace gray \\) \\( -size %[dims] -define gradient:angle=90 gradient: \\) -compose Multiply -delete 0 -composite \\) -compose CopyOpacity -composite \\) \\( \\( ${img2}[0] -resize %[dims] \\) \\( +clone \\( +clone -alpha extract -colorspace gray \\) \\( -size %[dims] -define gradient:angle=270 gradient: \\) -compose Multiply -delete 0 -composite \\) -compose CopyOpacity -composite \\) -compose Screen -composite ${newFile}`,
                files: newWorkingFiles,
                cursor: cursor - 1
            }

        case 'slats-transition':
            pieces = workingFiles.slice(cursor - 1, 2)
            if (pieces.length == 2) {
                [img1, img2] = pieces
                newWorkingFiles.splice(cursor - 1, 2, newFile)
            } else {
                img1 = workingFiles[cursor]
                img2 = workingFiles[cursor]
                newWorkingFiles.splice(cursor, 1, newFile)
            }
            return {
                command: `magick \\( \\( ${img1}[0] -set option:dims "%wx%h" \\) \\( +clone \\( +clone -alpha extract -colorspace gray \\) \\( example_mask.png -resize %[dims] \\) -compose Multiply -delete 0 -composite \\) -compose CopyOpacity -composite \\) \\( \\( ${img2}[0] -resize %[dims] \\) \\( +clone \\( +clone -alpha extract -colorspace gray \\) \\( example_mask.png -resize %[dims] -negate \\) -compose Multiply -delete 0 -composite \\) -compose CopyOpacity -composite \\) -compose Screen -composite ${newFile}`,
                files: newWorkingFiles,
                cursor: cursor - 1
            }

        case 'checkerboard-transition':
            pieces = workingFiles.slice(cursor - 1, 2)
            if (pieces.length == 2) {
                [img1, img2] = pieces
                newWorkingFiles.splice(cursor - 1, 2, newFile)
            } else {
                img1 = workingFiles[cursor]
                img2 = workingFiles[cursor]
                newWorkingFiles.splice(cursor, 1, newFile)
            }
            return {
                command: `magick \\( \\( ${img1}[0] -set option:dims "%wx%h" \\) \\( +clone \\( +clone -alpha extract -colorspace gray \\) \\( -size %[dims] pattern:checkerboard -auto-level \\) -compose Multiply -delete 0 -composite \\) -compose CopyOpacity -composite \\) \\( \\( ${img2}[0] -resize %[dims] \\) \\( +clone \\( +clone -alpha extract -colorspace gray \\) \\( -size %[dims] pattern:checkerboard -auto-level -negate \\) -compose Multiply -delete 0 -composite \\) -compose CopyOpacity -composite \\) -compose Screen -composite ${newFile}`,
                files: newWorkingFiles,
                cursor: cursor - 1
            }
    }
}

function combineNames(names) {
    const maxLength = Math.max(...(names.map(el => el.length)));
    const charactersPerName = Math.max(3, maxLength / names.length)
    let newName = ''
    names.forEach((name, index) => {
        if (index === names.length - 1) {
            // Always use the end of the last name
            end = name.length
            start = Math.max(0, name.length - charactersPerName)
        } else if (name.length <= charactersPerName) {
            start = 0
            end = name.length
        } else {
            start = Math.floor(name.length / names.length) * index
            end = Math.min(name.length, start + charactersPerName)
        }
        part = name.substring(start, end)

        newName = newName + name.substring(start, end)
    })
    return newName
}

async function generateNameFromSteps(steps) {
    const baseNames = steps
        .filter(step => step[0] === 'loadEmoji')
        .map(step => step[1])

    let newName = combineNames(baseNames)
    let parameterCache = ''
    steps.forEach(step => {
        const stepType = step[0]
        switch (stepType) {
            case "reverse":
                newName = newName.split("").reverse().join("");
                break;
            case "negate":
                newName = `${newName}idol`
                break;
            case "monochrome":
                newName = `boring${newName}`
                break;
            case "sepia-tone":
                newName = `old${newName}`
                break;
            case "flip":
                newName = `flipped${newName}`
                break;
            case "tint":
                color = getColorFromHex(step[1])
                newName = `${color}${newName}`
                break;
            case "flop":
                newName = `flopped${newName}`
                break;
            case "rotate":
                newName = `turnt${parameterOrDefault(parameterCache, step[1])}${newName}`
                break;
            case "roll-horizontal":
                newName = `pushed${parameterOrDefault(parameterCache, step[1])}${newName}`
                break;
            case "roll-vertical":
                newName = `lifted${parameterOrDefault(parameterCache, step[1])}${newName}`
                break;
            case "rainbowify":
                newName = `rainbow${newName}`
                break;
            case "addParameter":
                parameterCache = parameterCache + step[1]
                break
        }
        if(stepType != 'addParameter') {
            parameterCache = ''
        }
    })
    return newName
}

async function decollideName(name) {
    const existingEmoji = await loadEmojiList(true)
    if (name in existingEmoji
    || _emojiConverter.replace_colons(`:${name}:`) !== `:${name}:`){
        const words = randomWords(2)
        return `${name}-${words[0]}-${words[1]}`
    }
    return name
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function generateRandomComposeStep() {
    const randomInt = getRandomInt(5)
    switch (randomInt) {
        case 0:
            return (await generateBlendSteps(['checkered_flag'], true))[0]
        case 1:
            return (await generateBlendSteps(['heavy_plus_sign'], true))[0]
        case 2:
            return (await generateBlendSteps(['lower_left_paintbrush'], true))[0]
        case 3:
            return (await generateBlendSteps(['hourglass_flowing_sand'], true))[0]
        case 4:
            return (await generateBlendSteps(['fence'], true))[0]
    }
}

async function blendEmojis(emojis) {
    const emojiHash = emojis.join(":")
    if (!('exclamation' in emojis)
     && emojiHash in user_settings) {
        return user_settings[emojiHash]
    }
    await Promise.all(emojis.map(async (emoji) => { await downloadEmojiFile(emoji) }))
    const blendSteps = await generateBlendSteps(emojis)
    const workingDirectory = `tmp/${uuidv4()}`
    let parameter = ''
    let workingFiles = []
    let cursor = 0
    fs.mkdirSync(workingDirectory)
    let index = 0
    const commandObjects = blendSteps.map((step, i) => {
        commandObject = generateCommandObject(
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
        index = i
        return commandObject
    })
    while(workingFiles.length > 1) {
        commandObject = generateCommandObject(
            await generateRandomComposeStep(),
            index,
            cursor,
            workingDirectory,
            workingFiles,
        )
        workingFiles = commandObject.files
        cursor = commandObject.cursor
        index = index + 1
        commandObjects.push(commandObject)
    }
    commandObjects.forEach(commandObject => {
        if(commandObject.command) {
            execSync(commandObject.command)
        }
    })

    let newName = await generateNameFromSteps(blendSteps)
    newName = await decollideName(newName)
    console.log(newName)
    await uploadEmoji(newName, `${workingDirectory}/${blendSteps.length - 1}`)
    user_settings[emojiHash] = newName
    save_settings()
    return newName
}

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
        } else if (emojis.length > 0) {
            const newEmoji = await blendEmojis(emojis)
            await webClient.reactions.add({
                channel: event.channel,
                name: newEmoji,
                timestamp: event.ts,
            })
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
