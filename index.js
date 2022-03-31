import { words as popularWords } from 'popular-english-words';
import randomWords from 'random-words';
import util from 'util'
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path'
import { v4 as uuidv4 } from 'uuid';

import jsonfile from 'jsonfile';

import { SocketModeClient, LogLevel } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';


const userToken = process.env.V2_BOT_TOKEN;
const appToken = process.env.SOCKET_TOKEN;
const socketModeClient = new SocketModeClient({
    appToken,
});
const webClient = new WebClient(userToken);

//const main_channel = 'C01S87TUFGB' // test room
//const main_channel = 'C038ST76EM8' // 2022 test room
var main_channel = 'C02JZTC78'; // #general
var wordle_channel = 'C039NA2JSAX'; // #wordle
// const matts_user = 'U04GJ5MGB'; // Matt.
// const matts_user = 'U02JZTC5W'; // Dan.
const bots_user_id = 'U01S8AX8J4B';
var rate_limiter = 0 // how many posts since last rate limit reset

const allEmoji = ['eyes','raised_hands','pray','heavy_plus_sign','clap','bulb','dart','wave','thumbsup','tada','mega','white_circle','large_blue_circle','red_circle','joy','rolling_on_the_floor_laughing','smiley','smile','sweat_smile','wink','blush','yum','sunglasses','heart_eyes','kissing_heart','kissing','kissing_smiling_eyes','kissing_closed_eyes','relaxed','slightly_smiling_face','hugging_face','star-struck','thinking_face','face_with_raised_eyebrow','neutral_face','expressionless','no_mouth','face_with_rolling_eyes','smirk','persevere','disappointed_relieved','open_mouth','zipper_mouth_face','hushed','sleepy','tired_face','sleeping','relieved','stuck_out_tongue','stuck_out_tongue_winking_eye','stuck_out_tongue_closed_eyes','drooling_face','unamused','sweat','pensive','confused','upside_down_face','money_mouth_face','astonished','white_frowning_face','slightly_frowning_face','confounded','disappointed','worried','triumph','cry','sob','frowning','anguished','fearful','weary','exploding_head','grimacing','cold_sweat','scream','flushed','zany_face','dizzy_face','rage','angry','face_with_symbols_on_mouth','mask','face_with_thermometer','face_with_head_bandage','nauseated_face','face_vomiting','sneezing_face','innocent','face_with_cowboy_hat','clown_face','lying_face','shushing_face','face_with_hand_over_mouth','face_with_monocle','nerd_face','smiling_imp','imp','japanese_ogre','japanese_goblin','skull','skull_and_crossbones','host','alien','space_invader','robot_face','hankey','smiley_cat','smile_cat','joy_cat','heart_eyes_cat','smirk_cat','kissing_cat','scream_cat','crying_cat_face','pouting_cat','see_no_evil','hear_no_evil','speak_no_evil','baby','child','boy','girl','adult','man','woman','older_adult','older_man','older_woman','male-doctor','female-doctor','male-student','female-student','male-teacher','male-teacher','male-judge','female-judge','male-farmer','female-farmer','male-cook','female-cook','male-mechanic','female-mechanic','male-factory-worker','female-factory-worker','male-office-worker','female-office-worker','male-scientist','female-scientist','male-technologist','female-technologist','male-singer','female-singer','male-artist','female-artist','male-pilot','female-pilot','male-astronaut','female-astronaut','male-firefighter','female-firefighter','male-police-officer','female-police-officer','male-detective','female-detective','male-guard','female-guard','male-construction-worker','female-construction-worker','prince','princess','man-wearing-turban','woman-wearing-turban','man_with_gua_pi_mao','person_with_headscarf','bearded_person','blond-haired-man','blond-haired-woman','man_in_tuxedo','bride_with_veil','pregnant_woman','breast-feeding','angel','santa','mrs_claus','female_mage','male_mage','female_fairy','male_fairy','female_vampire','male_vampire','mermaid','merman','female_elf','male_elf','female_genie','male_genie','female_zombie','male_zombie','man-frowning','woman-frowning','man-pouting','woman-pouting','man-gesturing-no','woman-gesturing-no','man-gesturing-ok','woman-gesturing-ok','man-tipping-hand','woman-tipping-hand','man-raising-hand','woman-raising-hand','man-bowing','woman-bowing','man-facepalming','woman-facepalming','man-shrugging','woman-shrugging','man-getting-massage','woman-getting-massage','man-getting-haircut','woman-getting-haircut','man-walking','woman-walking','man-running','woman-running','dancer','man_dancing','man-with-bunny-ears-partying','woman-with-bunny-ears-partying','woman_in_steamy_room','man_in_steamy_room','woman_climbing','man_climbing','woman_in_lotus_position','man_in_lotus_position','bath','sleeping_accommodation','sunny','umbrella','cloud','snowflake','snowman','zap','cyclone','foggy','ocean','cat','dog','mouse','hamster','rabbit','wolf','frog','tiger','koala','bear','pig','pig_nose','cow','boar','monkey_face','monkey','horse','racehorse','camel','sheep','elephant','panda_face','snake','bird','baby_chick','hatched_chick','chicken','penguin','turtle','bug','honeybee','ant','beetle','snail','octopus','tropical_fish','fish','whale','dolphin','gift_heart','dolls','school_satchel','mortar_board','flags','fireworks','sparkler','wind_chime','jack_o_lantern','ghost','santa','christmas_tree','gift','bell','no_bell','tanabata_tree','tada','confetti_ball','balloon','crystal_ball','cd','dvd','floppy_disk','camera','video_camera','movie_camera','computer','tv','phone','telephone','telephone_receiver','pager','fax','minidisc','vhs','house','house_with_garden','school','office','post_office','hospital','bank','convenience_store','hotel','wedding','church','department_store','tent','factory','tokyo_tower','japan','mount_fuji','sunrise_over_mountains','sunrise','statue_of_liberty','bridge_at_night','carousel_horse','rainbow','ferris_wheel','fountain','roller_coaster','ship','speedboat','boat','sailboat'];

function arrUtilGetRandom(length) { return Math.floor(Math.random()*(length)); }

function arrUtilGetRandomSample(array, size) {
    var length = array.length;

    for(var i = size; i--;) {
        var index = arrUtilGetRandom(length);
        var temp = array[index];
        array[index] = array[i];
        array[i] = temp;
    }

    return array.slice(0, size);
}



///////////////////////////
// Set things up to save settings
var user_settings_file = 'user_settings.json'
var GAME_TYPES = {
    WORDLE: 'wordle',
    TURDLE: 'turdle',
    SONGLE: 'songle',
};
var MOD_TYPES = {
    LYRICS: 'lyrics',
    ONE_LONG: 'oneLong',
    RANDOM_LENGTH: 'randomLength',
    SHIFT_LETTERS: 'shiftLetters',
};
var user_settings = {
    userStates: {},
    globalMods: [],
    availableMods: [],
    highScorePost: null,
};

var answerListFile = 'answerList.json'
var answerList = [];

var lyricsFile = 'lyrics/final.json'
var lyrics = [];
var allWordsFile = 'allWords.json'
var allWords = [];

function load_settings() {
    if(fs.existsSync(user_settings_file)) {
        jsonfile.readFile(user_settings_file, function(err, obj) {
            if(!err) {
                user_settings = obj;
            }
        })
    }
    if(fs.existsSync(answerListFile)) {
        jsonfile.readFile(answerListFile, function(err, obj) {
            if(!err) {
                answerList = obj;
            }
        })
    }
    if(fs.existsSync(lyricsFile)) {
        jsonfile.readFile(lyricsFile, function(err, obj) {
            if(!err) {
                lyrics = obj;
            }
        })
    }
    if(fs.existsSync(allWordsFile)) {
        jsonfile.readFile(allWordsFile, function(err, obj) {
            if(!err) {
                allWords = obj;
            }
        })
    }
}

function save_settings() {
    fs.copyFileSync(user_settings_file, `${user_settings_file}.backup`);
    jsonfile.writeFileSync(user_settings_file, user_settings, {spaces: 2}, function(err) {
        if(err) {
            console.error(err);
        }
    });
}

async function set_stage() {
    // Only set the stage if user settings don't exist
    if(!fs.existsSync(user_settings_file)) {
        // Give the introductory message
        await webClient.chat.postMessage({
            text: `:wordle_correct_h_0::wordle_present_a_0::wordle_incorrect_p_0::wordle_incorrect_p_0::wordle_present_y_0::wordle_blank_0::wordle_present_a_0::wordle_correct_p_0::wordle_correct_r_0::wordle_incorrect_i_0::wordle_present_l_0::wordle_blank_0::wordle_incorrect_f_0::wordle_incorrect_o_0::wordle_correct_o_0::wordle_correct_l_0::wordle_present_s_0:

Please join #wordle to participate in the fun!

Guess the *WORDLE* in "six" tries.

Each guess must be a valid "five"-letter "word".  Hit the enter button to submit.

If your stumped you can click the "X" to give up, but you will never know the truth.

After each guess, the color of the emoji responses will change to show how close your guess was to the word.`,
            channel: main_channel,
        })
        await generateHighScorePost();
        save_settings();
    }
}

async function generateHighScorePost() {
    const highScorePost = await webClient.chat.postMessage({
        text: "this will be the high score table",
        channel: main_channel,
    })
    await webClient.reactions.add({
        channel: highScorePost.channel,
        name: 'thinking_face',
        timestamp: highScorePost.ts,
    })
    await webClient.reactions.add({
        channel: highScorePost.channel,
        name: 'thinkspin',
        timestamp: highScorePost.ts,
    })
    await webClient.reactions.add({
        channel: highScorePost.channel,
        name: 'thinkface-zalgo',
        timestamp: highScorePost.ts,
    })
    await webClient.reactions.add({
        channel: highScorePost.channel,
        name: 'notes',
        timestamp: highScorePost.ts,
    })
    await webClient.reactions.add({
        channel: highScorePost.channel,
        name: 'x',
        timestamp: highScorePost.ts,
    })

    user_settings.highScorePost = highScorePost;
    save_settings();
}

function getEmojiForWordleRank(rank) {
    switch(rank) {
        case 1:
            return '🥇';
        case 2:
            return '🥈';
        case 3:
            return '🥉';
        case 4:
            return '👑';
        case 5:
            return '🏵️';
        case 6:
            return '🪙';
        case 7:
            return '😆';
        case 8:
            return '😂';
        case 9:
            return '🤣';
        default:
            return '😭';
    }
}

function getEmojiForTurdleRank(rank) {
    switch(rank) {
        case 1:
            return '🐢';
        default:
            return '💩';
    }
}

function getEmojiForRank(rank, gameType) {
    switch (gameType) {
        case GAME_TYPES.WORDLE:
            return getEmojiForWordleRank(rank);
        case GAME_TYPES.TURDLE:
            return getEmojiForTurdleRank(rank);
    }
}

// from https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
function ordinal_suffix_of(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}


function generateHighScoresTable(scores, header, borderChar, footer, gameType) {
    const highScoreRows = scores.sort((a, b) => {
        if (a.score < b.score) {
            return -1;
        }
        if (a.score > b.score) {
            return 1;
        }
        if (a.score === b.score) {
            return 0;
        }
    }).reverse().map((row, index) => {
        const rank = index + 1;
        const ordinalRank = ordinal_suffix_of(rank);
        const emblem = getEmojiForRank(rank, gameType);
        const userName = row.user ? row.user.name : 'unknown';
        const score = row.score ? row.score : -1;
        const firstRow = `${ordinalRank}`;
        const secondRow = `${userName}`.slice(0, 20);
        const thirdRow = `${score} pts`;
        const firstBuffer = ' '.repeat(4 - firstRow.length);
        const secondBuffer = ' '.repeat(20 - secondRow.length);
        const thirdBuffer = ' '.repeat(10 - thirdRow.length);
        return `${emblem} ${firstBuffer}${firstRow}   ${secondRow}${secondBuffer}${thirdBuffer}${thirdRow}`;
    })
    const tableText = `${header}
${borderChar}  ${highScoreRows.join(`  ${borderChar}\n${borderChar}  `)}  ${borderChar}
${footer}`;
    return tableText;
}

function getScores(gameType) {
    const activeUserIds = Object.keys(user_settings.userStates);
    const scores = activeUserIds.map((userId) => {
        const user = userDict[userId];
        const userState = user_settings.userStates[userId];
        return {
            user,
            score: userState.scores[gameType],
        }
    }).filter((score) => score.score !== undefined);
    return scores
}

// 🟥 🟧 🟨 🟩 🟦 🟪 ⬛️ ⬜️ 🟫
async function updateHighScorePost() {
    if (!user_settings.highScorePost) {
        await generateHighScorePost();
    }
    const wordleScores = getScores(GAME_TYPES.WORDLE);
    const wordleHeader = `
**********************************************
#               WORDLE SCORES                #
# ------------------------------------------ #`;
    const wordleFooter = `**********************************************`;
    const wordleHighScoresTable = generateHighScoresTable(
        wordleScores,
        wordleHeader,
        '#',
        wordleFooter,
        GAME_TYPES.WORDLE,
    )

    const turdleScores = getScores(GAME_TYPES.TURDLE);
    const turdleHeader = `

**********************************************
#               TURDLE SCORES                #
# ------------------------------------------ #`;
    const turdleFooter = `**********************************************`;
    const turdleHighScoresTable = turdleScores.length === 0 ? `` : generateHighScoresTable(
        turdleScores,
        turdleHeader,
        '#',
        turdleFooter,
        GAME_TYPES.TURDLE,
    )
    const modeInstructions = `

\`The emoji below add personal mods ... do NOT click zalgo.\``;
    const highScoreTables = `\`\`\`${wordleHighScoresTable}${turdleHighScoresTable}\`\`\`${modeInstructions}`;

    webClient.chat.update({
        text: highScoreTables,
        channel: user_settings.highScorePost.channel,
        ts: user_settings.highScorePost.ts,
    })
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
// Set up user information
var userDict = {};

async function loadUsers() {
    const result = await webClient.users.list();
    result.members.forEach((user) => {
        userDict[user['id']] = user;
    });
}

function should_process_this_message(message) {
    return message.type == "message"
        && !message.hidden
        && !message.upload
        && !message.bot_id
        && message.channel == wordle_channel
}

function should_process_this_reaction(reaction) {
    return (reaction.type == "reaction_added"
            || reaction.type == "reaction_removed")
        && reaction.user !== bots_user_id
        && user_settings.highScorePost
        && reaction.item.channel === user_settings.highScorePost.channel
        && reaction.item.ts === user_settings.highScorePost.ts;
}

/////////////////////////////
// Wordle logic
function isTurd(str) {
    return [
        ':turd:',
        ':poo:',
        ':poop:',
        ':hankey:',
    ].includes(str);
}

function isTurtle(str) {
    return [
        ':turtle:',
    ].includes(str);
}

function isRealWord(str) {
    return allWords.includes(str);
}

function getWords(str) {
    return str
        .replace(/\s+/g, ' ')
        .split(' ');
}

function cleanGuess(guess) {
    return guess.replace(/[^\w\s]/g,'').toLowerCase().replace(/_/g,'');
}

function generateRandomEmoji(length) {
    return arrUtilGetRandomSample(allEmoji, length);
}

function generateResults(guess, mask, mods) {
    // const randomEmojiPool = generateRandomEmoji(mask.length);
    return mask.map((result, index) => {
        var character = guess.charAt(index);
        if (character !== character.toLowerCase()) {
            const realCharacter = character.toLowerCase();
            if (mods[MOD_TYPES.SHIFT_LETTERS]) {
                return `wordle_error_${realCharacter}_${index}`;
            } else {
                return `wordle_blank_${index}`;
            }
        }
        if (character === ' ') {
            character = 'blank';
        }
        switch (result) {
            case '_':
                return `wordle_blank_${index}`;
            case '?':
                return `wordle_present_${character}_${index}`;
            case '-':
                return `wordle_incorrect_${character}_${index}`;
            case '+':
                return `wordle_correct_${character}_${index}`;
        }
    })
}

function cleanWordleGuess(guess, answer, mods, skipRealWordCheck = false) {
    const answerLength = answer.length;
    var words = getWords(
        applyModsToGuess(
            mods,
            cleanGuess(guess),
        ),
    );
    if (!mods[MOD_TYPES.LYRICS]) {
        words = [words[0]];
    }
    var cleanedGuess = words.map((word) => {
        if(isRealWord(word) || mods[MOD_TYPES.LYRICS] || word == answer || (skipRealWordCheck && mods[MOD_TYPES.RANDOM_LENGTH])) {
            return word;
        } else {
            return word.toUpperCase() // ucase means wrong '.'.repeat(word.length); // . will mean "filler" in the answer key
        }
    })
    .join(' ');

    if (!mods[MOD_TYPES.LYRICS]
    && !mods[MOD_TYPES.RANDOM_LENGTH]) {
        if (cleanedGuess.length !== answerLength) {
            return fillWordleGuess('', answerLength);
        }
    }

    cleanedGuess = cleanedGuess.slice(0, answerLength)
    return fillWordleGuess(cleanedGuess, answerLength);
}

function fillWordleGuess(cleanedGuess, answerLength) {
    if (answerLength > cleanedGuess.length) {
        const fillString = '_'.repeat(answerLength - cleanedGuess.length);
        return `${cleanedGuess}${fillString}`;
    }
    return cleanedGuess
}

function cleanTurdleGuess(guess) {
    const words = getWords(guess);
    if (!words[0].startsWith(':')
    || !words[0].endsWith(':'))
        return '';
    return words[0];
}

function getRandomTurdle() {
    const turdOrTurtle = Math.random();
    if (turdOrTurtle > .5) {
        return 'turd';
    } else {
        return 'turtle';
    }
}

function generateNewTurdleAnswer(userId) {
    const answer = getRandomTurdle()
    return answer;
}

function getRandomWord(pattern = /.*/) {
    const filteredWords = allWords.filter(d => pattern.test(d));
    const randomIndex = Math.floor(Math.random() * filteredWords.length);
    return filteredWords[randomIndex];
}

function getNextRealWord(words, index) {
    const newIndex = (index + 1) % words.length;
    const nextWord = words[newIndex];
    if (!isRealWord(nextWord)) {
        return getNextRealWord(words, newIndex);
    }
    return nextWord;
}

function getRandomPopularWord(pattern = /.*/) {
    const filteredWords = popularWords.getMostPopularFilter(2000, d => pattern.test(d));
    const randomIndex = Math.floor(Math.random() * filteredWords.length);
    const randomWord = filteredWords[randomIndex]
    if (!isRealWord(randomWord)) {
        return getNextRealWord(filteredWords, randomIndex);
    }
    return randomWord;
}

function getRandomLyric() {
    return lyrics[Math.floor(Math.random() * lyrics.length)];
}

function generateNewWordleAnswer(userId) {
    const userState = getUserState(userId);
    const mods = userState.mods;

    var wordLength = 5
    if (mods[MOD_TYPES.RANDOM_LENGTH]) {
        wordLength = 5 + Math.ceil(Math.random() * 5);
    }
    if (mods[MOD_TYPES.ONE_LONG]) { // this is now a dict swap
        wordLength += 1
    }
    const wordPatternString = `^.{${wordLength}}$`;
    const wordPattern = new RegExp(wordPatternString);
    if (mods[MOD_TYPES.LYRICS]) {
        return getRandomLyric();
    } else if(mods[MOD_TYPES.ONE_LONG]) {
        return getRandomWord(wordPattern);
    } else {
        return getRandomPopularWord(wordPattern);
    }
}

function getModNames(mods) {
    const modNames = [];
    if (mods[MOD_TYPES.LYRICS]) {
        modNames.push("Lyrics");
    } else {
        if(mods[MOD_TYPES.ONE_LONG]) {
            modNames.push("Obscure");
        }
        if(mods[MOD_TYPES.RANDOM_LENGTH]) {
            modNames.push("Longer");
        }
    }
    if(mods[MOD_TYPES.SHIFT_LETTERS]) {
        modNames.push("ZALGO!!");
    }
    return modNames;
}

async function reportNewGame(userId, gameType) {
    if (gameType === GAME_TYPES.TURDLE) {
        return;
    }
    const userState = getUserState(userId);
    const username = userDict[userId].name;
    const mods = userState.currentGames[GAME_TYPES.WORDLE].mods;
    var modsString = ''
    const modNames = getModNames(mods);
    if(modNames.length > 0) {
        modsString = ` (mods: ${modNames.join(', ')})`;
    }
    const report = `New wordle game generated for ${username}.${modsString}`;

    await webClient.chat.postMessage({
        text: report,
        channel: wordle_channel,
    })
}

function generateNewGame(userId, gameType) {
    const newGame = {
        type: gameType,
        answer: '',
        guesses: [],
        mods: {},
    }

    switch (gameType) {
        case GAME_TYPES.TURDLE:
            newGame.answer = generateNewTurdleAnswer(userId);
            break;
        case GAME_TYPES.WORDLE:
            newGame.answer = generateNewWordleAnswer(userId);
    }

    const userState = getUserState(userId);
    newGame.mods = {...userState.mods};
    userState.currentGames[gameType] = newGame;
    setUserState(userState, userId);
    reportNewGame(userId, gameType);
    return newGame;
}

function generateUserState(userId) {
    const baseState = {
        currentGames: {},
        scores: {},
        mods: {},
    }
    return baseState;
}

function getUserState(userId) {
    if (!(userId in user_settings.userStates)) {
        user_settings.userStates[userId] = generateUserState(userId); // this MUST happen first or endless loop.
        generateNewGame(userId, GAME_TYPES.WORDLE);
        generateNewGame(userId, GAME_TYPES.TURDLE);
    }
    return user_settings.userStates[userId];
}

function setUserState(userState, userId) {
    user_settings.userStates[userId] = userState;
    save_settings();
}

function modifyScore(modification, userId, gameType) {
    const userState = getUserState(userId);
    if (!(gameType in userState.scores)) {
        userState.scores[gameType] = 0;
    }
    userState.scores[gameType] += modification;
    setUserState(userState, userId);
}

function registerGuess(guess, userId, gameType) {
    const userState = getUserState(userId);
    userState.currentGames[gameType].guesses.push(guess);
    setUserState(userState, userId);
}

function checkTurdleGuess(guess, userId) {
    // TODO: this has to be modded to support multi-character guesses
    // since turdle will clearly need to expand.
    const userState = getUserState(userId);
    const answer = userState.currentGames[GAME_TYPES.TURDLE].answer;
    const cleanedGuess = cleanTurdleGuess(guess);
    const responseEmoji = []
    if (isTurtle(cleanedGuess)) {
        if (answer === 'turtle') {
            responseEmoji.push('turdle_correct_turtle');
        } else {
            responseEmoji.push('turdle_incorrect_turtle');
        }
    } else if (isTurd(cleanedGuess)) {
        if (answer === 'turd') {
            responseEmoji.push('turdle_correct_turd');
        } else {
            responseEmoji.push('turdle_incorrect_turd');
        }
    } else {
        if (answer === 'turd') {
            responseEmoji.push('turdle_present_turd');
        } else {
            responseEmoji.push('turdle_present_turtle');
        }
    }
    return responseEmoji;
}

function caesarCipherByOne(message) {
    var alphabet = "abcdefghijklmnopqrstuvwxyz";
    var newalpha = "zabcdefghijklmnopqrstuvwxy";
    let result = "";
    message = message.toLowerCase();
    for (let i = 0; i < message.length; i++){
        let index = alphabet.indexOf(message[i]);
        if(index === -1) {
            result += " ";
        } else {
            result += newalpha[index];
        }
    }
    return result;
}

function applyModsToGuess(mods, guess) {
    if (mods[MOD_TYPES.SHIFT_LETTERS]) {
        return caesarCipherByOne(guess)
    }
    return guess;
}

function checkWordleGuess(guess, userId, isRootCheck = false) {
    const userState = getUserState(userId);
    const answer = userState.currentGames[GAME_TYPES.WORDLE].answer;
    const answerCells = answer.split('');
    const cleanedGuess = cleanWordleGuess(
        guess,
        answer,
        userState.currentGames[GAME_TYPES.WORDLE].mods,
        !isRootCheck,
    );

    // Find the correct characters
    const startingMask = cleanedGuess.split('');
    const correctMask = startingMask.map((character, index) => {
        if (answerCells[index] === character) {
            answerCells[index] = '+';
            return '+';
        } else {
            return character;
        }
    });

    // Find the present / absent characters
    const finalMask = correctMask.map((character, index) => {
        if (character === '.'
         || character === '+'
         || character === '_') {
            return character;
        }
        const characterIndex = answerCells.indexOf(character);
        if (characterIndex === -1) {
            return '-';
        } else {
            answerCells[characterIndex] = '?';
            return '?';
        }
    })

    const results = generateResults(
        cleanedGuess,
        finalMask,
        userState.currentGames[GAME_TYPES.WORDLE].mods,
    )

    if (!isWordleEmpty(results) && isRootCheck) {
        registerGuess(cleanedGuess, userId, GAME_TYPES.WORDLE);
    }

    return results;
}

function isWordleVictory(wordleResult) {
    return wordleResult.reduce(
        (isVictory, result) => isVictory && result.includes('_correct'),
        true,
    )
}

function isWordleEmpty(wordleResult) {
    return wordleResult.reduce(
        (isEmpty, result) => isEmpty && result.includes('_blank_'),
        true,
    )
}

function isTurdleGuess(guess) {
    return cleanTurdleGuess(guess) !== '';
}

function calculateWordleScore(userId) {
    const userState = getUserState(userId);
    const {
        mods,
        answer,
        guesses,
    } = userState.currentGames[GAME_TYPES.WORDLE];

    var score = answer.length + 1;
    if (!mods[MOD_TYPES.LYRICS]
     && mods[MOD_TYPES.ONE_LONG]) {
        score = score * 2
    }
    if (mods[MOD_TYPES.SHIFT_LETTERS]) {
        score = score * 3;
    }
    score = score - guesses.length
    return Math.max(0, score);
}

function getFlavor(score) {
    if (score == 0) {
        return ' ... how embarrassing.';
    }
    if (score == 1) {
        return ' better than nothing, right?';
    }
    return ''
}

async function reportWordleResult(score, userId) {
    const userState = getUserState(userId);
    const username = userDict[userId].name;
    const guesses = userState.currentGames[GAME_TYPES.WORDLE].guesses;
    const flavor = getFlavor(score);
    const report = `${username} just got ${score} points (${guesses.length} guesses: \`${guesses.join('` / `')}\`)${flavor}`;

    await webClient.chat.postMessage({
        text: report,
        channel: wordle_channel,
    })
}

function getCharacterFromResultEmoji(emoji) {
    const parts = emoji.split('_');
    return parts.at(-2);
}

function isPresentResultEmoji(emoji) {
    return emoji.includes('_present');
}

function isIncorrectResultEmoji(emoji) {
    return emoji.includes('_incorrect');
}

function isCorrectResultEmoji(emoji) {
    return emoji.includes('_correct');
}

function generateKeyboard(correct, present, incorrect) {
    const letters = {
        'a': 'wordle_unchecked_a',
        'b': 'wordle_unchecked_b',
        'c': 'wordle_unchecked_c',
        'd': 'wordle_unchecked_d',
        'e': 'wordle_unchecked_e',
        'f': 'wordle_unchecked_f',
        'g': 'wordle_unchecked_g',
        'h': 'wordle_unchecked_h',
        'i': 'wordle_unchecked_i',
        'j': 'wordle_unchecked_j',
        'k': 'wordle_unchecked_k',
        'l': 'wordle_unchecked_l',
        'm': 'wordle_unchecked_m',
        'n': 'wordle_unchecked_n',
        'o': 'wordle_unchecked_o',
        'p': 'wordle_unchecked_p',
        'q': 'wordle_unchecked_q',
        'r': 'wordle_unchecked_r',
        's': 'wordle_unchecked_s',
        't': 'wordle_unchecked_t',
        'u': 'wordle_unchecked_u',
        'v': 'wordle_unchecked_v',
        'w': 'wordle_unchecked_w',
        'x': 'wordle_unchecked_x',
        'y': 'wordle_unchecked_y',
        'z': 'wordle_unchecked_z',
        'blank': 'wordle_unchecked_blank',
    }
    Array.from(incorrect).forEach((character) => {
        letters[character] = `wordle_incorrect_${character}_0`;
    })
    Array.from(present).forEach((character) => {
        letters[character] = `wordle_present_${character}_0`;
    })
    Array.from(correct).forEach((character) => {
        letters[character] = `wordle_correct_${character}_0`;
    })

    return `:${letters['q']}: :${letters['w']}: :${letters['e']}: :${letters['r']}: :${letters['t']}: :${letters['y']}: :${letters['u']}: :${letters['i']}: :${letters['o']}: :${letters['p']}:
:${letters['a']}: :${letters['s']}: :${letters['d']}: :${letters['f']}: :${letters['g']}: :${letters['h']}: :${letters['j']}: :${letters['k']}: :${letters['l']}:
:${letters['z']}: :${letters['x']}: :${letters['c']}: :${letters['v']}: :${letters['b']}: :${letters['n']}: :${letters['m']}:`
}

function generateWordKnowledgeReport(userId, gameType) {
    if (gameType !== GAME_TYPES.WORDLE) {
        return '';
    }
    const userState = getUserState(userId);
    const game = userState.currentGames[GAME_TYPES.WORDLE];
    const guesses = [...game.guesses];

    const correctLetters = new Set();
    const presentLetters = new Set();

    const incorrectLetters = new Set();
    const results = guesses.map((guess) => {
        const result = checkWordleGuess(guess, userId);
        result.map((emoji) => {
            let character = getCharacterFromResultEmoji(emoji);
            if (character === ' ') {
                character = 'blank';
            }
            if (isCorrectResultEmoji(emoji)) {
                correctLetters.add(character);
            } else if (isPresentResultEmoji(emoji)) {
                presentLetters.add(character);
            } else if (isIncorrectResultEmoji(emoji)) {
                incorrectLetters.add(character);
            }
        });
        return result;
    });

    const keyboard = generateKeyboard(
        correctLetters,
        presentLetters,
        incorrectLetters,
    )

    const resultLines = results.map(result => result.map(emoji => `:${emoji}:`).join(''))
    return `${resultLines.join('\n\r')}

${keyboard}`;
}

function postKnowledgeReport(report, event) {
    webClient.chat.postMessage({
        text: report,
        channel: event.channel,
        thread_ts: event.ts,
    })
}

function checkGuess(guess, userId, event) {
    const gameType = isTurdleGuess(guess)
        ? GAME_TYPES.TURDLE
        : GAME_TYPES.WORDLE

    switch (gameType) {
        case GAME_TYPES.TURDLE:
            const turdleResult = checkTurdleGuess(
                guess,
                userId,
            );
            if (isWordleVictory(turdleResult)) {
                modifyScore(1, userId, GAME_TYPES.TURDLE);
                generateNewGame(userId, GAME_TYPES.TURDLE);
            } else {
                generateNewGame(userId, GAME_TYPES.TURDLE);
                // modifyScore(-1, userId, GAME_TYPES.TURDLE);
            }
            return turdleResult;
        case GAME_TYPES.WORDLE:
            const wordleResult = checkWordleGuess(
                guess,
                userId,
                true,
            );
            if (isWordleVictory(wordleResult)) {
                const wordleScore = calculateWordleScore(userId);
                reportWordleResult(wordleScore, userId);
                modifyScore(
                    wordleScore,
                    userId,
                    GAME_TYPES.WORDLE
                );
                generateNewGame(userId, GAME_TYPES.WORDLE);
            } else {
                if (!isWordleEmpty(wordleResult)) {
                    const knowledgeReport = generateWordKnowledgeReport(userId,  GAME_TYPES.WORDLE);
                    postKnowledgeReport(knowledgeReport, event)
                    //modifyScore(-1, userId, GAME_TYPES.WORDLE);
                }
            }
            if (isWordleEmpty(wordleResult)) {
                return [];
            }
            return wordleResult;
    }
    return [];
}

/*
{
  client_msg_id: 'b2745e2a-2a80-4782-bfc3-b1bf0cd07d17',
  type: 'message',
  text: 'test',
  user: 'U02JZTC5W',
  ts: '1648264331.921279',
  team: 'T02JZTC5Q',
  blocks: [ { type: 'rich_text', block_id: 'RG33h', elements: [Array] } ],
  channel: 'C01S87TUFGB',
  event_ts: '1648264331.921279',
  channel_type: 'group'
}
 */
async function processMessage(event) {
    const {
        text,
        user,
    } = event;
    const results = checkGuess(text, user, event)
    updateHighScorePost();
    results.reduce(
        async (previous, result) => {
            await previous
            try {
                await webClient.reactions.add({
                    channel: event.channel,
                    name: result,
                    timestamp: event.ts,
                })
            } catch {}
            await new Promise(r => setTimeout(r, 50))
        },
        Promise.resolve(),
    )
}

function enableModForUser(mod, userId) {
    const userState = getUserState(userId);
    userState.mods[mod] = true;
    setUserState(userState, userId);
}

function disableModForUser(mod, userId) {
    const userState = getUserState(userId);
    userState.mods[mod] = false;
    setUserState(userState, userId);
}

function resetWordle(userId) {
    generateNewGame(userId, GAME_TYPES.WORDLE);
}

async function processReactionAdd(event) {
    const {
        reaction,
        user,
    } = event;
    switch (reaction) {
        case "notes": // lyrics
            enableModForUser(MOD_TYPES.LYRICS, user);
            resetWordle(user);
            return;
        case "thinking_face": // add one letter
            enableModForUser(MOD_TYPES.ONE_LONG, user);
            resetWordle(user);
            return;
        case "thinkspin": // add one-to-five letters
            enableModForUser(MOD_TYPES.RANDOM_LENGTH, user);
            resetWordle(user);
            return;
        case "thinkface-zalgo": // shift the letters by one in your guess
            enableModForUser(MOD_TYPES.SHIFT_LETTERS, user);
            resetWordle(user);
            return;
        case "x": // reset current games
            resetWordle(user);
            return;
    }
}

async function processReactionRemove(event) {
    const {
        reaction,
        user,
    } = event;
    switch (reaction) {
        case "notes": // lyrics
            disableModForUser(MOD_TYPES.LYRICS, user);
            resetWordle(user);
            return;
        case "thinking_face": // add one letter
            disableModForUser(MOD_TYPES.ONE_LONG, user);
            resetWordle(user);
            return;
        case "thinkspin": // add one-to-five letters
            disableModForUser(MOD_TYPES.RANDOM_LENGTH, user);
            resetWordle(user);
            return;
        case "thinkface-zalgo": // shift the letters by one in your guess
            disableModForUser(MOD_TYPES.SHIFT_LETTERS, user);
            resetWordle(user);
            return;
        case "x": // reset current games
            resetWordle(user);
            return;
    }
}

///////////////////////////
// Process every message on slack
socketModeClient.on('message', async ({event, body, ack}) => {
    await ack();
    if(should_process_this_message(event)) {
        processMessage(event);
    }
});

socketModeClient.on('reaction_added', async ({event, body, ack}) => {
    await ack();
    if(should_process_this_reaction(event)) {
        processReactionAdd(event);
    }
});

socketModeClient.on('reaction_removed', async ({event, body, ack}) => {
    await ack();
    if(should_process_this_reaction(event)) {
        processReactionRemove(event);
    }
});

(async () => {
  // Connect to Slack
  await socketModeClient.start();
  await loadUsers();
  load_settings();
  console.log("APRIL HAS STARTED!");
  set_stage();
})();

// Set the stage

// Load settings

// reset rate limit every 10 seconds
// function resetRateLimit() {
//     rate_limiter = 0;
// }
// setInterval(resetRateLimit, 20000);
