const axios = require('axios');
const logger = require('../utils/logger');

class CaptchaService {
  constructor() {
    this.apiKey = process.env.CAPTCHA_API_KEY;
    this.apiUrl = 'http://2captcha.com';
  }

  async solveCaptcha(page) {
    try {
      if (!this.apiKey) {
        logger.warn('CAPTCHA API key not configured');
        return false;
      }

      // Check for reCAPTCHA
      const recaptchaSiteKey = await page.$eval('[data-sitekey]', el => el.getAttribute('data-sitekey')).catch(() => null);
      
      if (recaptchaSiteKey) {
        return await this.solveRecaptcha(page, recaptchaSiteKey);
      }

      // Check for hCaptcha
      const hcaptchaSiteKey = await page.$eval('[data-sitekey]', el => {
        const parent = el.closest('.h-captcha');
        return parent ? el.getAttribute('data-sitekey') : null;
      }).catch(() => null);

      if (hcaptchaSiteKey) {
        return await this.solveHcaptcha(page, hcaptchaSiteKey);
      }

      logger.warn('No supported CAPTCHA found');
      return false;
    } catch (error) {
      logger.error('Error solving CAPTCHA:', error);
      return false;
    }
  }

  async solveRecaptcha(page, siteKey) {
    try {
      const pageUrl = page.url();

      // Submit CAPTCHA to 2captcha
      const submitResponse = await axios.post(
        `${this.apiUrl}/in.php`,
        new URLSearchParams({
          key: this.apiKey,
          method: 'userrecaptcha',
          googlekey: siteKey,
          pageurl: pageUrl,
          json: 1
        })
      );

      if (submitResponse.data.status !== 1) {
        throw new Error(`Failed to submit CAPTCHA: ${submitResponse.data.request}`);
      }

      const captchaId = submitResponse.data.request;
      logger.info(`CAPTCHA submitted, ID: ${captchaId}`);

      // Poll for solution (max 2 minutes)
      const maxAttempts = 24;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const resultResponse = await axios.get(
          `${this.apiUrl}/res.php?key=${this.apiKey}&action=get&id=${captchaId}&json=1`
        );

        if (resultResponse.data.status === 1) {
          const token = resultResponse.data.request;

          // Inject solution into page
          await page.evaluate((token) => {
            document.getElementById('g-recaptcha-response').innerHTML = token;
            const callback = window.grecaptchaCallback || window.recaptchaCallback;
            if (callback) callback(token);
          }, token);

          logger.info('CAPTCHA solved successfully');
          return true;
        } else if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
          throw new Error(`Failed to solve CAPTCHA: ${resultResponse.data.request}`);
        }

        attempts++;
      }

      throw new Error('CAPTCHA solution timeout');
    } catch (error) {
      logger.error('Error solving reCAPTCHA:', error);
      return false;
    }
  }

  async solveHcaptcha(page, siteKey) {
    try {
      const pageUrl = page.url();

      // Submit CAPTCHA to 2captcha
      const submitResponse = await axios.post(
        `${this.apiUrl}/in.php`,
        new URLSearchParams({
          key: this.apiKey,
          method: 'hcaptcha',
          sitekey: siteKey,
          pageurl: pageUrl,
          json: 1
        })
      );

      if (submitResponse.data.status !== 1) {
        throw new Error(`Failed to submit CAPTCHA: ${submitResponse.data.request}`);
      }

      const captchaId = submitResponse.data.request;
      logger.info(`hCaptcha submitted, ID: ${captchaId}`);

      // Poll for solution
      const maxAttempts = 24;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultResponse = await axios.get(
          `${this.apiUrl}/res.php?key=${this.apiKey}&action=get&id=${captchaId}&json=1`
        );

        if (resultResponse.data.status === 1) {
          const token = resultResponse.data.request;

          // Inject solution
          await page.evaluate((token) => {
            document.querySelector('[name="h-captcha-response"]').value = token;
            const callback = window.hcaptchaCallback;
            if (callback) callback(token);
          }, token);

          logger.info('hCaptcha solved successfully');
          return true;
        } else if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
          throw new Error(`Failed to solve CAPTCHA: ${resultResponse.data.request}`);
        }

        attempts++;
      }

      throw new Error('CAPTCHA solution timeout');
    } catch (error) {
      logger.error('Error solving hCaptcha:', error);
      return false;
    }
  }
}

module.exports = new CaptchaService();


