const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Monitor = sequelize.define('Monitor', {
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
    profile_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'profiles',
        key: 'id'
      }
    },
    bls_center: {
      type: DataTypes.ENUM('algiers_1', 'algiers_2', 'algiers_3', 'algiers_4', 'oran_1', 'oran_2', 'oran_3'),
      allowNull: false
    },
    check_interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 3,
        max: 30
      }
    },
    autofill_mode: {
      type: DataTypes.ENUM('manual', 'semi', 'full'),
      defaultValue: 'manual'
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'stopped', 'error'),
      defaultValue: 'stopped'
    },
    last_check: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_check: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_checks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    slots_found: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_slot_found: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'monitors',
    indexes: [
      { fields: ['user_id', 'status'] },
      { fields: ['status', 'next_check'] }
    ]
  });

  return Monitor;
};
