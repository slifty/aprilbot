'use strict'

const fs = require('fs');
const path = require('path');

class Cookies {

  /**
   * Restores cookies for the current browser session.
   *
   * @param page
   *   The current page instance.
   */
  static restore(page) {
    let cookies = this.get();
    return page.setCookie(...cookies.cookies);
  }

  static get() {
    const cookiePath = `${path.dirname(require.main.filename)}/emojiUpload/cookies.json`;
    if (!fs.existsSync(cookiePath)) {
      return false;
    }
    let cookies = JSON.parse(fs.readFileSync(cookiePath));
    return cookies;
  }

  /**
   * Saves passed cookies to a file.
   *
   * @param cookies
   *   The cookies to save to the file.
   */
  static save(cookies, teamname) {
    const data = {
      cookies,
      teamname,
    }
    fs.writeFileSync(`${path.dirname(require.main.filename)}/emojiUpload/cookies.json`, JSON.stringify(data));
  }

}

module.exports = Cookies;
