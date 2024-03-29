'use strict';

const Input = require('./Input');
const selectors = require('./selectors');

class Emoji  {

  /**
   * Fills and upload the emoji form.
   *
   * @param file
   *   The file object to upload.
   * @param page
   *   The current page instance.
   */
  static async upload(file, name, page) {
    const filename = file.name;
    await page.waitForSelector(selectors.UPLOAD.START)
    await page.click(selectors.UPLOAD.START)
    const element = await page.$(selectors.UPLOAD.IMAGE);
    await Input.type(selectors.UPLOAD.NAME, name, page);
    await element.uploadFile(file.dir + '/' + file.base);
    await page.waitForTimeout(500);
    await page.click(selectors.UPLOAD.SUBMIT);
    await page.waitForResponse(response => {
        return response.url().startsWith('https://thegpf.slack.com/api/emoji.add')
    });
  }
}

module.exports = Emoji;
