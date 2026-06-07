import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    type: { type: String, enum: ['fillBlank', 'passageRecall', 'emailWriting'], required: true },
    content: { type: String, default: '' },
    expectedAnswer: { type: String, default: '' },
    imageUrl: { type: String, default: '', trim: true },
    timeLimit: { type: Number, required: true, min: 1, default: 120 },
    revealTime: { type: Number, default: 0, min: 0 },
    allowManualReview: { type: Boolean, default: true },
    marks: { type: Number, default: 10, min: 0 },
    orderIndex: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    questions: [questionSchema],
    totalTimeSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Bulletproof Pre-Save Hook using Async instead of callbacks
quizSchema.pre('save', async function () {
  if (this.questions && this.questions.length > 0) {
    // Sort directly in place safely
    this.questions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    let total = 0;
    this.questions.forEach((q, index) => {
      q.orderIndex = index + 1;
      
      if (q.type !== 'passageRecall') {
        q.revealTime = 0;
      }
      
      const rTime = Number(q.revealTime) || 0;
      const tLimit = Number(q.timeLimit) || 0;
      
      total += (rTime + tLimit);
    });

    this.totalTimeSeconds = total;
  } else {
    this.totalTimeSeconds = 0;
  }
});

export default mongoose.model('Quiz', quizSchema);