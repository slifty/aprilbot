var chai = require('chai'),
    command_modules = require('../command_modules');

var should = chai.should();

describe('command_modules/append.js', function() {
    it('should append a string to the end of a message', function(done) {
        var message = {
            text: 'hey ho the derry-o'
        };

        var settings = {
            terms: ['boo','hoo']
        };

        command_modules.append
                        .modify_message(message, settings)
                        .text
                        .should
                        .equal('hey ho the derry-oboohoo');

        done();
    });
});

describe('command_modules/prepend.js', function() {
    it('should prepend a string to the start of a message', function(done) {
        var message = {
            text: 'hey ho the derry-o'
        };

        var settings = {
            terms: ['boo','hoo']
        };

        command_modules.prepend
                        .modify_message(message, settings)
                        .text
                        .should
                        .equal('boohoohey ho the derry-o');

        done();
    });
});

describe('command_modules/nick.js', function() {
    it('should replace a user name in a message', function(done) {
        var message = {
            user: 'boo hoo'
        };

        var settings = {
            replacement: 'hey ho'
        };

        command_modules.nick
                        .modify_message(message, settings)
                        .user
                        .should
                        .equal('hey ho');

        done();
    });
});

describe('command_modules/replace.js', function() {
    it('should do basic text replacement in a message', function(done) {
        var message = {
            text: 'hey ho the derry-o'
        };

        var settings = {
            pairs: [{
                type: 'basic',
                value: {
                    source: 'hey',
                    replacement: 'boo',
                }
            }]
        };

        command_modules.replace
                        .modify_message(message, settings)
                        .text
                        .should
                        .equal('boo ho the derry-o');

        done();
    });
});


describe('command_modules/replace.js', function() {
    it('should do regex text replacement in a message', function(done) {
        var message = {
            text: 'hey ho the derry-o'
        };

        var settings = {
            pairs: [{
                type: 'regex',
                value: {
                    source: '.+',
                    replacement: 'boo',
                }
            }]
        };

        command_modules.replace
                        .modify_message(message, settings)
                        .text
                        .should
                        .equal('boo');

        done();
    });
});


describe('command_modules/tronc.js', function() {
    it('should troncify a message', function(done) {
        var message = {
            text: 'hey ho the derry-o'
        };

        var settings = {
            letters: 'htr'
        };

        command_modules.tronc
                        .modify_message(message, settings)
                        .text
                        .should
                        .equal(':tronc_h:ey :tronc_h:o :tronc_t::tronc_h:e de:tronc_r::tronc_r:y-o');

        done();
    });
});


