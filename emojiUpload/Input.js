'use strict';

class Input {

  /**
   * Fills an input field with the given text.
   *
   * @param selector
   *   The selector to set the text for.
   * @param text
   *   The text to set the input to.
   * @param page
   *   The current page instance.
   */
  static async type(selector, text, page) {
    return await page.type(selector, text)
  }
  static async set(selector, text, page) {
    return await page.evaluate((text, selector) => {
      document.querySelector(selector).value = text;
    }, text, selector);
  }

}

module.exports = Input;
