const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Slot = sequelize.define('Slot', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    monitor_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'monitors',
        key: 'id'
      }
    },
    slot_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    slot_time: {
      type: DataTypes.STRING,
      allowNull: true
    },
    center: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('available', 'booked', 'expired'),
      defaultValue: 'available'
    },
    notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    booking_attempted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    booking_attempted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    booking_status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      allowNull: true
    }
  }, {
    tableName: 'slots',
    indexes: [
      { fields: ['monitor_id'] },
      { fields: ['status', 'slot_date'] }
    ]
  });

  return Slot;
};


