const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    biometric_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    biometric_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('biometric_data');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value) {
          this.setDataValue('biometric_data', encrypt(value));
        } else {
          this.setDataValue('biometric_data', null);
        }
      }
    },
    subscription_status: {
      type: DataTypes.ENUM('free', 'premium', 'expired'),
      defaultValue: 'free'
    },
    subscription_expiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.ENUM('credit_card', 'debit_card', 'none'),
      defaultValue: 'none'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.generateToken = function() {
    return jwt.sign(
      { userId: this.id, email: this.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  };

  User.prototype.verifyBiometric = function(biometricData) {
    if (!this.biometric_data) return false;
    try {
      // Compare stored credential ID with provided assertion
      // Handle both base64 encoded JSON and plain strings
      let storedData, providedData;
      
      try {
        // Try parsing as base64 JSON
        storedData = JSON.parse(Buffer.from(this.biometric_data, 'base64').toString());
        providedData = JSON.parse(Buffer.from(biometricData, 'base64').toString());
      } catch (e) {
        // Fallback: try direct JSON parse (if stored as plain JSON)
        storedData = JSON.parse(this.biometric_data);
        providedData = JSON.parse(biometricData);
      }
      
      // Verify credential ID matches
      return storedData.rawId === providedData.rawId || 
             storedData.id === providedData.id ||
             (storedData.response && providedData.response && 
              storedData.response.clientDataJSON === providedData.response.clientDataJSON);
    } catch (error) {
      // Fallback to simple string comparison for backward compatibility
      try {
        return this.biometric_data === biometricData;
      } catch (e) {
        return false;
      }
    }
  };

  return User;
};
