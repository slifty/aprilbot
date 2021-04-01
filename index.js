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
    'left_right_arrow': [],
    'arrow_up_down': [],
    'arrow_forward': [],
    'arrow_up_small': [],
    'arrow_double_up': [],
    'arrow_down_small': [],
    'arrow_double_down': [],
    'arrow_heading_down': [],
    'arrow_heading_up': [],
    'arrow_right_hook': [],
    'arrow_backward': [],

    // Number Mods
    'one': [],
    'two': [],
    'three': [],
    'four': [],
    'five': [],
    'six': [],
    'seven': [],
    'eight': [],
    'nine': [],
    'zero': [],

    // Style Mods
    'cubimal_chick': [], // Justin => Fractal Pattern
}

function should_process_this_message(message) {
    return message.type == "message"
        && !message.hidden
        && !message.upload
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

async function executeCommand(command) {

}

function generateCommand(step, outfile, infiles) {
    const stepType = step[0]
    switch (stepType) {
        case 'loadEmoji':
            return `cp input_emoji/${step[1]} ${outfile}`

        // color
        case 'tint':
            return `magick ${infiles[0]} -colorspace gray -fill '${step[1]}' -tint 100 ${outfile}`
        case 'negate':
            // invert the colors
            return `magick convert ${infiles[0]} -negate ${outfile}`
        case 'monochrome':
            // transform to pure black and white (like print)
            return `magick convert ${infiles[0]} -monochrome ${outfile}`
        case 'sepia-tone':
            return `magick convert ${infiles[0]} -sepia-tone 80%`

        // geometry
        case 'rotate90':
            return `magick convert ${infiles[0]} -rotate 90 ${outfile}`
        case 'rotate180':
            return `magick convert ${infiles[0]} -rotate 180 ${outfile}`
        case 'rotate270':
            return `magick convert ${infiles[0]} -rotate -90 ${outfile}`
        case 'flip':
            // vertical flip
            return `magick convert ${infiles[0]} -flip ${outfile}`
        case 'flop':
            // horizontal flip
            return `magick convert ${infiles[0]} -flop ${outfile}`
        case 'shift-left':
            return `magick convert ${infiles[0]} -roll +2+0 ${outfile}`
        case 'shift-rigt':
            return `magick convert ${infiles[0]} -roll -2+0 ${outfile}`
        case 'shift-up':
            return `magick convert ${infiles[0]} -roll +0+2 ${outfile}`
        case 'shift-down':
            return `magick convert ${infiles[0]} -roll +0-2 ${outfile}`

        // animation
        case 'reverse':
            // reverse a gif
            return `magick convert ${infiles[0]} -reverse ${outfile}`


    }
}

async function blendEmojis(emojis) {
    await Promise.all(emojis.map(async (emoji) => { await downloadEmojiFile(emoji) }))
    const blendSteps = await generateBlendSteps(emojis)
    const workingDirectory = `tmp/${uuidv4()}`
    let previousFile = null
    fs.mkdirSync(workingDirectory)
    const commands = blendSteps.map((step, i) => {
        const command = generateCommand(
            step,
            `${workingDirectory}/${i}`,
            [previousFile],
        )
        previousFile = `${workingDirectory}/${i}`
        return command
    })
    commands.forEach(command => {
        console.log(command)
        execSync(command)
    })
}

blendEmojis(['tinkfase', 'large_green_square'])

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
