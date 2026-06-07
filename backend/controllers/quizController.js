import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, ' ');

const normalizeText = (value = '') =>
  stripHtml(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const splitExpectedAnswers = (value = '') =>
  String(value).split(/[\n|,;]/).map((v) => normalizeText(v)).filter(Boolean);

const autoGradeFillBlank = (userAnswer, expectedAnswer) => {
  if (!expectedAnswer?.trim()) return null;
  const user = normalizeText(userAnswer);
  if (!user) return false;
  const options = splitExpectedAnswers(expectedAnswer);
  if (!options.length) return null;
  return options.some((expected) => user === expected || user.includes(expected) || expected.includes(user));
};

const sanitizeQuizForExam = (quizDoc) => {
  const quiz = quizDoc.toObject();
  quiz.questions = (quiz.questions || []).map(({ expectedAnswer, ...rest }) => rest);
  return quiz;
};

export const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .select('title description isPublished totalTimeSeconds questions createdAt updatedAt');

    const response = quizzes.map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      isPublished: quiz.isPublished,
      totalTimeSeconds: quiz.totalTimeSeconds,
      questionCount: quiz.questions?.length || 0,
    }));
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch quizzes.' });
  }
};

// NEW: Fetch all attempts for the logged-in user
export const getUserAttempts = async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user._id })
      .sort({ updatedAt: -1 }) // Show most recent first
      .populate({ path: 'quizId', select: 'title description totalTimeSeconds' });
    
    return res.json(attempts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch attempt history.' });
  }
};

export const startAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz || (!quiz.isPublished && req.user?.role !== 'admin')) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    let attempt = await Attempt.findOne({ userId: req.user._id, quizId, status: 'in_progress' });

    if (!attempt) {
      const answers = quiz.questions.map((question) => ({
        questionId: question._id,
        status: 'unanswered',
        evaluationStatus: 'pending',
        userAnswer: '',
        timeTakenSeconds: 0,
        marksAwarded: 0,
        maxMarks: question.marks || 0,
        needsManualReview: question.type !== 'fillBlank' || !question.expectedAnswer?.trim(),
        adminFeedback: '',
      }));

      attempt = await Attempt.create({
        userId: req.user._id,
        quizId,
        startedAt: new Date(),
        status: 'in_progress',
        currentQuestionIndex: 0,
        answers,
      });
    }

    const currentIndex = Math.max(0, attempt.answers.findIndex((answer) => answer.status === 'unanswered'));
    attempt.currentQuestionIndex = currentIndex === -1 ? quiz.questions.length : currentIndex;
    await attempt.save();

    return res.json({ quiz: sanitizeQuizForExam(quiz), attempt });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to start attempt.' });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, userAnswer = '', timeTakenSeconds = 0, isFinal = false, advanceOnSave = false } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (String(attempt.userId) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden.' });
    if (attempt.status === 'completed') return res.status(400).json({ error: 'Attempt already completed.' });

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });

    const question = quiz.questions.id(questionId) || quiz.questions.find((q) => String(q._id) === String(questionId));
    if (!question) return res.status(404).json({ error: 'Question not found.' });

    const answerDoc = attempt.answers.find((answer) => String(answer.questionId) === String(questionId));
    if (!answerDoc) return res.status(404).json({ error: 'Answer slot not found.' });

    const trimmedAnswer = String(userAnswer).trim();
    const isSkipped = trimmedAnswer.length === 0;

    answerDoc.userAnswer = trimmedAnswer;
    answerDoc.timeTakenSeconds = Number(timeTakenSeconds) || 0;
    answerDoc.submittedAt = new Date();
    answerDoc.maxMarks = question.marks || 0;

    if (isSkipped) {
      answerDoc.status = 'skipped';
      answerDoc.evaluationStatus = 'skipped';
      answerDoc.needsManualReview = false;
      answerDoc.marksAwarded = 0;
    } else if (question.type === 'fillBlank') {
      const grade = autoGradeFillBlank(trimmedAnswer, question.expectedAnswer);
      answerDoc.status = 'answered';
      answerDoc.needsManualReview = grade === null;
      answerDoc.evaluationStatus = grade === null ? 'pending' : grade ? 'correct' : 'incorrect';
      answerDoc.marksAwarded = grade === null ? 0 : grade ? question.marks || 0 : 0;
    } else {
      answerDoc.status = 'answered';
      answerDoc.evaluationStatus = 'pending';
      answerDoc.needsManualReview = true;
      answerDoc.marksAwarded = 0;
    }

    if (advanceOnSave) {
      const nextIndex = attempt.answers.findIndex((answer) => answer.status === 'unanswered');
      attempt.currentQuestionIndex = nextIndex === -1 ? quiz.questions.length : nextIndex;

      const hasRemainingUnanswered = attempt.answers.some((answer) => answer.status === 'unanswered');
      if (isFinal || !hasRemainingUnanswered) {
        attempt.status = 'completed';
        attempt.completedAt = new Date();
        attempt.totalTimeTakenSeconds = Math.max(0, Math.round((attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000));
      }
    }

    await attempt.save();
    return res.json(attempt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to submit answer.' });
  }
};

export const completeAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (String(attempt.userId) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden.' });

    if (attempt.status !== 'completed') {
      attempt.status = 'completed';
      attempt.completedAt = new Date();
      attempt.totalTimeTakenSeconds = Math.max(0, Math.round((attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000));
      await attempt.save();
    }
    return res.json(attempt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to complete attempt.' });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await Attempt.findById(attemptId)
      .populate({ path: 'quizId', select: 'title description totalTimeSeconds questions createdAt updatedAt' })
      .populate('userId', 'name email role');

    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (req.user.role !== 'admin' && String(attempt.userId._id || attempt.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    return res.json(attempt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch attempt details.' });
  }
};

export const deleteAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await Attempt.findById(attemptId);
    
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });
    if (String(attempt.userId) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden.' });

    await Attempt.findByIdAndDelete(attemptId);
    return res.json({ message: 'History deleted successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete history.' });
  }
};