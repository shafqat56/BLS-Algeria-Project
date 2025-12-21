const { DataTypes } = require('sequelize');
const { encrypt, decrypt } = require('../utils/encryption');

module.exports = (sequelize) => {
  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    full_name: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('full_name');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value) {
          this.setDataValue('full_name', encrypt(value));
        }
      }
    },
    passport_number: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('passport_number');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value) {
          this.setDataValue('passport_number', encrypt(value));
        }
      }
    },
    date_of_birth: {
      type: DataTypes.DATE,
      allowNull: false
    },
    nationality: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('phone');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value) {
          this.setDataValue('phone', encrypt(value));
        }
      }
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('email');
        if (!value) return null;
        try {
          return decrypt(value);
        } catch (error) {
          return null;
        }
      },
      set(value) {
        if (value) {
          this.setDataValue('email', encrypt(value));
        }
      }
    },
    visa_category: {
      type: DataTypes.ENUM('tourist', 'student', 'work', 'business', 'transit', 'family', 'medical', 'cultural', 'sports', 'official', 'diplomatic'),
      allowNull: false
    },
    bls_center: {
      type: DataTypes.ENUM('algiers_1', 'algiers_2', 'algiers_3', 'algiers_4', 'oran_1', 'oran_2', 'oran_3'),
      allowNull: false
    },
    appointment_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profile_name: {
      type: DataTypes.STRING,
      defaultValue: 'Default Profile'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'profiles'
  });

  return Profile;
};
