import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';

// Rock-solid normalizer that guarantees schema requirements
const normalizeQuestions = (questions = []) =>
  questions.map((question, index) => {
    const type = question.type || 'fillBlank';
    // Ensure timeLimit never goes below 1, preventing Schema Validation Error
    const timeLimit = Math.max(1, Number(question.timeLimit) || 120);
    const revealTime = type === 'passageRecall' ? Math.max(0, Number(question.revealTime) || 0) : 0;

    return {
      title: question.title?.trim() || `Question ${index + 1}`,
      type,
      content: question.content || '',
      expectedAnswer: question.expectedAnswer || '',
      imageUrl: question.imageUrl || '',
      timeLimit,
      revealTime,
      allowManualReview: typeof question.allowManualReview === 'boolean' ? question.allowManualReview : true,
      marks: Math.max(0, Number(question.marks) || 10),
      orderIndex: index + 1,
    };
  });

const calcTotalTime = (questions) => 
  questions.reduce((sum, q) => sum + (q.revealTime || 0) + (q.timeLimit || 0), 0);

export const createQuiz = async (req, res) => {
  try {
    const questions = normalizeQuestions(req.body.questions || []);
    const payload = {
      ...req.body,
      questions,
      totalTimeSeconds: calcTotalTime(questions),
      createdBy: req.user.role === 'admin' ? null : req.user._id,
    };

    const quiz = await Quiz.create(payload);
    return res.status(201).json(quiz);
  } catch (error) {
    console.error("Create Quiz Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    return res.status(500).json({ error: 'Failed to create quiz. Check server logs.' });
  }
};

export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    return res.json(quizzes);
  } catch (error) {
    console.error("Get Quizzes Error:", error);
    return res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (Array.isArray(payload.questions)) {
      payload.questions = normalizeQuestions(payload.questions);
      payload.totalTimeSeconds = calcTotalTime(payload.questions);
    }

    const quiz = await Quiz.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    return res.json(quiz);
  } catch (error) {
    console.error("Update Quiz Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    return res.status(500).json({ error: 'Failed to update quiz.' });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    return res.json({ message: 'Quiz deleted successfully.' });
  } catch (error) {
    console.error("Delete Quiz Error:", error);
    return res.status(500).json({ error: 'Failed to delete quiz.' });
  }
};

export const getPendingReviews = async (req, res) => {
  try {
    const attempts = await Attempt.find({
      status: 'completed',
      'answers.needsManualReview': true,
    })
      .sort({ updatedAt: -1 })
      .populate('userId', 'name email')
      .populate('quizId', 'title description');

    return res.json(attempts);
  } catch (error) {
    console.error("Get Pending Reviews Error:", error);
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
};

export const evaluateAnswer = async (req, res) => {
  try {
    const { attemptId, answerId } = req.params;
    const { marksAwarded = 0, adminFeedback = '', evaluationStatus } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    const answer = attempt.answers.id(answerId);
    if (!answer) return res.status(404).json({ error: 'Answer not found.' });

    answer.marksAwarded = Number(marksAwarded) || 0;
    answer.adminFeedback = adminFeedback;
    answer.needsManualReview = false;
    answer.reviewedAt = new Date();
    answer.reviewedBy = req.user._id;

    if (evaluationStatus) {
      answer.evaluationStatus = evaluationStatus;
    } else if (answer.marksAwarded > 0) {
      answer.evaluationStatus = 'partial';
    } else {
      answer.evaluationStatus = 'incorrect';
    }

    await attempt.save();
    return res.json(attempt);
  } catch (error) {
    console.error("Evaluate Answer Error:", error);
    return res.status(500).json({ error: 'Failed to evaluate answer.' });
  }
};