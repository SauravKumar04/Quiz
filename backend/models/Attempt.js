import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ['unanswered', 'answered', 'skipped'],
      default: 'unanswered',
    },
    evaluationStatus: {
      type: String,
      enum: ['pending', 'correct', 'incorrect', 'partial', 'skipped'],
      default: 'pending',
    },
    userAnswer: {
      type: String,
      default: '',
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
    marksAwarded: {
      type: Number,
      default: 0,
    },
    maxMarks: {
      type: Number,
      default: 0,
    },
    needsManualReview: {
      type: Boolean,
      default: false,
    },
    adminFeedback: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: true }
);

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    totalTimeTakenSeconds: {
      type: Number,
      default: 0,
    },
    answers: [answerSchema],
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, quizId: 1, status: 1 });

export default mongoose.model('Attempt', attemptSchema);