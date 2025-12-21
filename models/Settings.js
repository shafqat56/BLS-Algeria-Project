const { DataTypes } = require('sequelize');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (sequelize) => {
  const Settings = sequelize.define('Settings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    email_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    whatsapp_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    telegram_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sms_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_address: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('email_address');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value && value.trim() !== '') {
          this.setDataValue('email_address', encrypt(value));
        } else {
          this.setDataValue('email_address', null);
        }
      }
    },
    whatsapp_number: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('whatsapp_number');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value && value.trim() !== '') {
          this.setDataValue('whatsapp_number', encrypt(value));
        } else {
          this.setDataValue('whatsapp_number', null);
        }
      }
    },
    telegram_chat_id: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('telegram_chat_id');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value && value.trim() !== '') {
          this.setDataValue('telegram_chat_id', encrypt(value));
        } else {
          this.setDataValue('telegram_chat_id', null);
        }
      }
    },
    phone_number: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('phone_number');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value && value.trim() !== '') {
          this.setDataValue('phone_number', encrypt(value));
        } else {
          this.setDataValue('phone_number', null);
        }
      }
    },
    captcha_api_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('captcha_api_key');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value && value.trim() !== '') {
          this.setDataValue('captcha_api_key', encrypt(value));
        } else {
          this.setDataValue('captcha_api_key', null);
        }
      }
    },
    captcha_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    payment_method: {
      type: DataTypes.ENUM('credit_card', 'debit_card', 'none'),
      defaultValue: 'none'
    }
  }, {
    tableName: 'settings'
  });

  return Settings;
};
