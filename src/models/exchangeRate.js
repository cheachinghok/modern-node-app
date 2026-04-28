import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema(
  {
    usdToKhr: {
      type: Number,
      required: [true, 'Exchange rate is required'],
      min: [1, 'Exchange rate must be positive'],
      default: 4100,
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('ExchangeRate', exchangeRateSchema);
