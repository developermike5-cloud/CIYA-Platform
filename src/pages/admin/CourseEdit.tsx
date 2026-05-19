import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Course } from '../../types';

export default function CourseEdit() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isNew = !courseId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Course>({
    title: '',
    subtitle: '',
    slug: '',
    thumbnail: '',
    description: '',
    category: '',
    youtube_link: '',
    level: 'Beginner',
    price: 0,
    modules: '[]',
    publish_status: 'Draft'
  });

  useEffect(() => {
    if (isNew) return;
    const fetchCourse = async () => {
      try {
        const docRef = doc(db, 'courses', courseId as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(docSnap.data() as Course);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `courses/${courseId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'price' ? Number(value) : value 
    }));
  };

  const handleJSONChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, modules: e.target.value }));
  };

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Validate JSON
      if (formData.modules) {
        try { JSON.parse(formData.modules); } catch { throw new Error("Invalid Modules JSON"); }
      }

      const id = isNew ? generateId() : (courseId as string);
      const docRef = doc(db, 'courses', id);
      
      const payload: Course = { ...formData };
      
      if (isNew) {
        payload.createdAt = serverTimestamp() as any;
        payload.updatedAt = serverTimestamp() as any;
        await setDoc(docRef, payload);
      } else {
        payload.updatedAt = serverTimestamp() as any;
        const { id: _, createdAt, ...updateData } = payload as any; // Don't override createdAt on update
        await updateDoc(docRef, updateData);
      }
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save course');
      handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `courses`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error && !saving) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{isNew ? 'New Course' : 'Edit Course'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <input type="text" name="subtitle" value={formData.subtitle || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <input type="text" name="category" value={formData.category || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
            <select name="level" value={formData.level || 'Beginner'} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 bg-white">
              <option value="Beginner">Beginner</option>
              <option value="Advanced">Advanced</option>
              <option value="Masterclass">Masterclass</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price (number)</label>
            <input type="number" name="price" value={formData.price || 0} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Publish Status</label>
            <select name="publish_status" value={formData.publish_status} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 bg-white">
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail URL</label>
          <input type="text" name="thumbnail" value={formData.thumbnail || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">YouTube Link</label>
          <input type="text" name="youtube_link" value={formData.youtube_link || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea rows={4} name="description" value={formData.description || ''} onChange={handleChange} className="w-full border border-slate-300 rounded p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Modules (JSON Array)</label>
          <textarea 
            rows={10} 
            name="modules" 
            value={formData.modules || '[]'} 
            onChange={handleJSONChange} 
            className="w-full border border-slate-300 rounded p-2 font-mono text-sm bg-slate-50"
            placeholder="[{ title: 'Module 1', lessons: [] }]"
          />
          <p className="text-xs text-slate-500 mt-1">Must be valid JSON stringified format.</p>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button type="button" onClick={() => navigate('/admin')} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Course'}
          </button>
        </div>
      </form>
    </div>
  );
}
