import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';
import {
  Edit2,
  LogOut,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

const createQuestion = (index = 0) => ({
  title: `Question ${index + 1}`,
  type: 'fillBlank',
  content: '',
  expectedAnswer: '',
  imageUrl: '',
  timeLimit: 120,
  revealTime: 30,
  allowManualReview: true,
  marks: 10,
  orderIndex: index + 1,
});

const createDefaultForm = () => ({
  title: '',
  description: '',
  isPublished: false,
  questions: [],
});

const cloneQuizToForm = (quiz) => ({
  _id: quiz._id,
  title: quiz.title || '',
  description: quiz.description || '',
  isPublished: !!quiz.isPublished,
  questions: (quiz.questions || []).map((question, index) => ({
    title: question.title || `Question ${index + 1}`,
    type: question.type || 'fillBlank',
    content: question.content || '',
    expectedAnswer: question.expectedAnswer || '',
    imageUrl: question.imageUrl || '',
    timeLimit: question.timeLimit || 120,
    revealTime: question.revealTime || 30,
    allowManualReview:
      typeof question.allowManualReview === 'boolean'
        ? question.allowManualReview
        : true,
    marks: question.marks || 10,
    orderIndex: question.orderIndex || index + 1,
  })),
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    const savedDraft = localStorage.getItem('adminQuizDraft');
    if (savedDraft && !editingId) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch {
        localStorage.removeItem('adminQuizDraft');
      }
    }
    fetchAdminQuizzes();
  }, []);

  useEffect(() => {
    if (!editingId && isCreating) {
      localStorage.setItem('adminQuizDraft', JSON.stringify(formData));
    }
  }, [formData, editingId, isCreating]);

  const fetchAdminQuizzes = async () => {
    try {
      const { data } = await api.get('/admin/quizzes');
      setQuizzes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const published = quizzes.filter((q) => q.isPublished).length;
    const drafts = quizzes.length - published;
    return {
      total: quizzes.length,
      published,
      drafts,
    };
  }, [quizzes]);

  const uploadQuizImage = async (file) => {
    const fd = new FormData();
    fd.append('file', file);

    const { data } = await api.post('/uploads/image', fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.url;
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, createQuestion(prev.questions.length)],
    }));
  };

  const updateQuestion = (index, field, value) => {
    setFormData((prev) => {
      const next = [...prev.questions];
      next[index] = { ...next[index], [field]: value };

      if (field === 'type' && value !== 'passageRecall') {
        next[index].revealTime = 0;
      }

      return { ...prev, questions: next };
    });
  };

  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleSaveQuiz = async () => {
    setSaving(true);
    try {
      // Strictly enforce numbers locally so the backend schema never rejects the payload
      const payload = {
        ...formData,
        questions: (formData.questions || []).map((q, index) => ({
          ...q,
          orderIndex: index + 1,
          timeLimit: Math.max(1, Number(q.timeLimit) || 120), // Prevents sending 0
          revealTime: q.type === 'passageRecall' ? Math.max(0, Number(q.revealTime) || 0) : 0,
          marks: Math.max(0, Number(q.marks) || 0),
        })),
      };

      if (editingId) {
        await api.put(`/admin/quizzes/${editingId}`, payload);
      } else {
        await api.post('/admin/quizzes', payload);
        localStorage.removeItem('adminQuizDraft');
      }

      setIsCreating(false);
      setEditingId(null);
      setFormData(createDefaultForm());
      await fetchAdminQuizzes();
    } catch (error) {
      alert(error?.response?.data?.error || 'Error saving quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (quiz) => {
    setFormData(cloneQuizToForm(quiz));
    setEditingId(quiz._id);
    setIsCreating(true);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this quiz permanently? This cannot be undone.');
    if (!ok) return;

    try {
      await api.delete(`/admin/quizzes/${id}`);
      await fetchAdminQuizzes();
    } catch (error) {
      alert(error?.response?.data?.error || 'Error deleting quiz.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminQuizDraft');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Welcome, {user?.name || 'Admin'}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Build and manage verbal ability quizzes from one polished panel.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setIsCreating((prev) => !prev);
                if (isCreating) {
                  setEditingId(null);
                  setFormData(createDefaultForm());
                } else {
                  setFormData(createDefaultForm());
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Plus size={16} />
              {isCreating ? 'Close editor' : 'Create quiz'}
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Total quizzes', stats.total],
            ['Published', stats.published],
            ['Drafts', stats.drafts],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-neutral-200 bg-white p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {isCreating ? (
          <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.04)]">
            <div className="border-b border-neutral-200 px-6 py-5 md:px-8">
              <h2 className="text-xl font-semibold tracking-tight">
                {editingId ? 'Edit quiz' : 'Create new quiz'}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                One question box, one solution box, and image upload inside both.
              </p>
            </div>

            <div className="space-y-8 px-6 py-6 md:px-8 md:py-8">
              <div className="grid gap-4">
                <input
                  className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-3xl font-semibold tracking-tight outline-none transition focus:border-neutral-950"
                  placeholder="Quiz title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <textarea
                  className="min-h-[100px] w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-neutral-950"
                  placeholder="Quiz description and instructions"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
                <label className="inline-flex w-fit items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublished: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                  />
                  Publish immediately
                </label>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">Question flow</h3>
                  <span className="text-sm text-neutral-500">
                    {formData.questions.length} questions
                  </span>
                </div>

                {(formData.questions || []).map((question, index) => (
                  <div
                    key={index}
                    className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 md:p-6"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="text-sm font-medium text-neutral-700">
                        Question {index + 1}
                      </div>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-neutral-700">
                          Question type
                        </label>
                        <select
                          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-950"
                          value={question.type}
                          onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                        >
                          <option value="fillBlank">Fill in the blank</option>
                          <option value="passageRecall">Passage recall</option>
                          <option value="emailWriting">Email writing</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {question.type === 'passageRecall' ? (
                          <div>
                            <label className="mb-2 block text-sm font-medium text-neutral-700">
                              Reveal time
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-950"
                              value={question.revealTime}
                              onChange={(e) =>
                                updateQuestion(index, 'revealTime', Number(e.target.value))
                              }
                            />
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500 flex items-center">
                            Reveal time disabled for this type
                          </div>
                        )}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700">
                            Answer time
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 outline-none transition focus:border-neutral-950"
                            value={question.timeLimit}
                            onChange={(e) =>
                              updateQuestion(index, 'timeLimit', Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Question box
                      </label>
                      <RichTextEditor
                        value={question.content}
                        onChange={(html) => updateQuestion(index, 'content', html)}
                        placeholder="Write the question, passage, instructions, and insert images here..."
                        onUploadImage={uploadQuizImage}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Expected answer / solution box
                      </label>
                      <RichTextEditor
                        value={question.expectedAnswer}
                        onChange={(html) => updateQuestion(index, 'expectedAnswer', html)}
                        placeholder="Write the expected answer, solution, rubric, and insert images here..."
                        onUploadImage={uploadQuizImage}
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                      <div className="text-sm font-medium text-neutral-700">
                        Marks
                      </div>
                      <input
                        type="number"
                        min="0"
                        className="w-24 rounded-xl border border-neutral-200 px-3 py-2 outline-none"
                        value={question.marks}
                        onChange={(e) =>
                          updateQuestion(index, 'marks', Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={addQuestion}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-950"
                >
                  <Plus size={18} />
                  Add question
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-6">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingId(null);
                    setFormData(createDefaultForm());
                  }}
                  className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuiz}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : editingId ? 'Update quiz' : 'Save quiz'}
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
            Loading quizzes...
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{quiz.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        quiz.isPublished
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {quiz.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">
                    {quiz.questions?.length || 0} questions • {quiz.totalTimeSeconds || 0}s total
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(quiz)}
                    className="rounded-2xl border border-neutral-200 bg-white p-3 text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-950"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(quiz._id)}
                    className="rounded-2xl border border-neutral-200 bg-white p-3 text-red-500 transition hover:border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {quizzes.length === 0 && (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
                No quizzes created yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}