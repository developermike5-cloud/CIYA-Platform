import { Course } from '../types';
import { safeStorage } from './safeStorage';
import staticCourses from '../data/courses.json';
import staticAdvancedCourses from '../data/advanced_courses.json';

// Broadcast channel/event for synchronizing across component mounts or active sessions
const BROADCAST_EVENT = 'ciya_courses_updated';

// Helper to safely parse dates / Firestore timestamps to ISO string
function parseDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (typeof val._seconds === 'number') {
      return new Date(val._seconds * 1000).toISOString();
    }
    if (val.toDate && typeof val.toDate === 'function') {
      return val.toDate().toISOString();
    }
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

// Helper to normalize static courses
function normalizeCourse(c: any): Course {
  const normalizedDays = (c.days || []).map((day: any, dIdx: number) => {
    let assignment = day.assignment;
    if (assignment) {
      assignment = {
        prompt: assignment.prompt || '',
        dueNote: assignment.dueNote || ''
      };
    }

    return {
      dayNumber: day.dayNumber || (dIdx + 1),
      title: day.title || `Day ${dIdx + 1}: Study Module`,
      description: day.description || '',
      assignment: assignment,
      videos: (day.videos || []).map((v: any, vIdx: number) => ({
        id: v.id || `${dIdx}-${vIdx}-${Math.random().toString(36).substring(2, 6)}`,
        title: v.title || '',
        video_url: v.video_url || v.url || '',
        url: v.url || v.video_url || '',
        duration: v.duration || '10 min',
        description: v.description || '',
        resources: v.resources || '',
        checkType: v.checkType || 'none',
        check: v.check || null,
        funFact: v.funFact || null
      }))
    };
  });

  return {
    ...c,
    id: c.id,
    skill: c.skill || (c.category?.toLowerCase().includes('web') ? 'web' : c.category?.toLowerCase().includes('film') ? 'film' : c.category?.toLowerCase().includes('image') ? 'image' : 'web'),
    category: c.category || 'AI Website Class',
    level: c.level || 'Beginner',
    tier: c.tier || 'beginner',
    price: Number(c.price) || 0,
    instructor: c.instructor || 'CIYA Team',
    outcomes: c.outcomes || '',
    requirements: c.requirements || '',
    publish_status: c.publish_status || (c.status === 'published' ? 'Published' : 'Draft'),
    status: c.status || (c.publish_status === 'Published' ? 'published' : 'draft'),
    isLocked: !!c.isLocked,
    days: normalizedDays,
    createdAt: parseDate(c.createdAt),
    updatedAt: parseDate(c.updatedAt)
  } as Course;
}

export const coursesStore = {
  getStandardCoursesOnly(): Course[] {
    const cached = safeStorage.getItem('ciya_frontend_courses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeCourse);
        }
      } catch (e) {
        console.error("Error parsing frontend standard courses from storage:", e);
      }
    }
    const initial = (staticCourses as any[]).map(normalizeCourse);
    safeStorage.setItem('ciya_frontend_courses', JSON.stringify(initial));
    return initial;
  },

  getAdvancedCourses(): Course[] {
    const cached = safeStorage.getItem('ciya_frontend_advanced_courses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeCourse);
        }
      } catch (e) {
        console.error("Error parsing frontend advanced courses from storage:", e);
      }
    }
    const initial = (staticAdvancedCourses as any[]).map(normalizeCourse);
    safeStorage.setItem('ciya_frontend_advanced_courses', JSON.stringify(initial));
    return initial;
  },

  getCourses(): Course[] {
    const standard = this.getStandardCoursesOnly();
    const advanced = this.getAdvancedCourses();
    return [...standard, ...advanced];
  },

  async saveAllAdvanced(courses: Course[]): Promise<void> {
    try {
      safeStorage.setItem('ciya_frontend_advanced_courses', JSON.stringify(courses));
      const merged = [...this.getStandardCoursesOnly(), ...courses];
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: merged }));

        fetch('/api/advanced-courses/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ courses })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("Successfully updated advanced_courses.json on disk.");
          }
        })
        .catch(err => {
          console.warn("Unable to save advanced_courses.json on disk:", err);
        });
      }
      return Promise.resolve();
    } catch (e) {
      console.error("Failed to save advanced courses to safeStorage:", e);
      return Promise.reject(e);
    }
  },

  async saveAll(courses: Course[]): Promise<void> {
    const standard = courses.filter(c => !(c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass'));
    const advanced = courses.filter(c => (c.tier === 'advanced' || c.tier === 'masterclass' || c.level === 'Advanced' || c.level === 'Masterclass'));

    try {
      safeStorage.setItem('ciya_frontend_courses', JSON.stringify(standard));
      safeStorage.setItem('ciya_frontend_advanced_courses', JSON.stringify(advanced));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: courses }));
        
        // Save standard to backend files (courses.json)
        fetch('/api/courses/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ courses: standard })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("Successfully updated courses.json on disk.");
          }
        })
        .catch(err => {
          console.warn("Unable to save courses.json on disk:", err);
        });

        // Save advanced to backend files (advanced_courses.json)
        fetch('/api/advanced-courses/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ courses: advanced })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("Successfully updated advanced_courses.json on disk.");
          }
        })
        .catch(err => {
          console.warn("Unable to save advanced_courses.json on disk:", err);
        });
      }
      return Promise.resolve();
    } catch (e) {
      console.error("Failed to save courses to safeStorage:", e);
      return Promise.reject(e);
    }
  },

  saveCourse(course: Course): Promise<void> {
    const isAdvanced = course.tier === 'advanced' || course.tier === 'masterclass' || course.level === 'Advanced' || course.level === 'Masterclass';
    
    // Remove from deleted list if we are saving/adding it back
    try {
      const deletedCached = safeStorage.getItem('ciya_deleted_course_ids');
      if (deletedCached) {
        const deletedIds = JSON.parse(deletedCached);
        if (Array.isArray(deletedIds) && deletedIds.includes(course.id)) {
          const filteredIds = deletedIds.filter(id => id !== course.id);
          safeStorage.setItem('ciya_deleted_course_ids', JSON.stringify(filteredIds));
        }
      }
    } catch (e) {}

    if (isAdvanced) {
      const current = this.getAdvancedCourses();
      const idx = current.findIndex(c => c.id === course.id);
      const updatedCourse = {
        ...normalizeCourse(course),
        updatedAt: new Date().toISOString()
      };

      if (idx >= 0) {
        current[idx] = updatedCourse;
      } else {
        current.push(updatedCourse);
      }
      return this.saveAllAdvanced(current);
    } else {
      const current = this.getStandardCoursesOnly();
      const idx = current.findIndex(c => c.id === course.id);
      const updatedCourse = {
        ...normalizeCourse(course),
        updatedAt: new Date().toISOString()
      };

      if (idx >= 0) {
        current[idx] = updatedCourse;
      } else {
        current.push(updatedCourse);
      }
      return this.saveAll([...current, ...this.getAdvancedCourses()]);
    }
  },

  async deleteCourse(courseId: string): Promise<void> {
    const currentStandard = this.getStandardCoursesOnly();
    const currentAdvanced = this.getAdvancedCourses();
    
    const filteredStandard = currentStandard.filter(c => c.id !== courseId);
    const filteredAdvanced = currentAdvanced.filter(c => c.id !== courseId);
    
    // Add to deleted cache to prevent reappearing on merge
    try {
      const deletedCached = safeStorage.getItem('ciya_deleted_course_ids');
      const deletedIds = deletedCached ? JSON.parse(deletedCached) : [];
      if (Array.isArray(deletedIds) && !deletedIds.includes(courseId)) {
        deletedIds.push(courseId);
        safeStorage.setItem('ciya_deleted_course_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.warn("Error caching deleted course ID:", e);
    }

    return this.saveAll([...filteredStandard, ...filteredAdvanced]);
  },

  cloneCourse(course: Course, newTitle: string): Promise<Course> {
    const randomId = 'course_' + Math.random().toString(36).substring(2, 11);
    const clonedDays = (course.days || []).map((day, dIdx) => ({
      dayNumber: day.dayNumber || (dIdx + 1),
      title: day.title || `Day ${dIdx + 1}`,
      description: day.description || '',
      assignment: day.assignment ? {
        prompt: day.assignment.prompt || '',
        dueNote: day.assignment.dueNote || ''
      } : undefined,
      videos: (day.videos || []).map((v) => ({
        id: Math.random().toString(36).substring(2, 9),
        title: v.title || '',
        video_url: v.video_url || v.url || '',
        url: v.video_url || v.url || '',
        duration: v.duration || '10 min',
        description: v.description || '',
        resources: v.resources || '',
        checkType: v.checkType || 'none',
        check: v.check ? JSON.parse(JSON.stringify(v.check)) : null,
        funFact: v.funFact ? { ...v.funFact } : null
      }))
    }));

    const cloned: Course = {
      ...course,
      id: randomId,
      title: newTitle,
      publish_status: 'Draft',
      status: 'draft',
      days: clonedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isAdvanced = cloned.tier === 'advanced' || cloned.tier === 'masterclass' || cloned.level === 'Advanced' || cloned.level === 'Masterclass';
    if (isAdvanced) {
      const current = this.getAdvancedCourses();
      current.push(cloned);
      return this.saveAllAdvanced(current).then(() => cloned);
    } else {
      const current = this.getStandardCoursesOnly();
      current.push(cloned);
      return this.saveAll([...current, ...this.getAdvancedCourses()]).then(() => cloned);
    }
  },

  subscribe(callback: (courses: Course[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: any) => {
      callback(e.detail || this.getCourses());
    };
    window.addEventListener(BROADCAST_EVENT, handler);
    return () => {
      window.removeEventListener(BROADCAST_EVENT, handler);
    };
  }
};

// Synchronize with server-side courses.json file on startup
if (typeof window !== 'undefined') {
  (async () => {
    try {
      console.log("Starting courses synchronization on boot...");
      
      let fetchedStandard: Course[] = [];
      let fetchedAdvanced: Course[] = [];

      // 1. Fetch standard from server disk api /api/courses
      try {
        const res = await fetch(`/api/courses?t=${Date.now()}`);
        if (res.ok) {
          const serverCourses = await res.json();
          if (Array.isArray(serverCourses) && serverCourses.length > 0) {
            fetchedStandard = serverCourses.map(normalizeCourse);
            console.log(`Loaded ${fetchedStandard.length} standard courses from server.`);
          }
        }
      } catch (serverErr) {
        console.warn("Unable to load standard courses from server disk on startup:", serverErr);
      }

      // 2. Fetch advanced from server disk api /api/advanced-courses
      try {
        const res = await fetch(`/api/advanced-courses?t=${Date.now()}`);
        if (res.ok) {
          const serverCourses = await res.json();
          if (Array.isArray(serverCourses) && serverCourses.length > 0) {
            fetchedAdvanced = serverCourses.map(normalizeCourse);
            console.log(`Loaded ${fetchedAdvanced.length} advanced courses from server.`);
          }
        }
      } catch (serverErr) {
        console.warn("Unable to load advanced courses from server disk on startup:", serverErr);
      }

      // Fallbacks if server files are empty
      if (fetchedStandard.length === 0) {
        fetchedStandard = (staticCourses as any[]).map(normalizeCourse);
      }
      if (fetchedAdvanced.length === 0) {
        fetchedAdvanced = (staticAdvancedCourses as any[]).map(normalizeCourse);
      }

      // Merge deleted IDs filter
      let deletedIds: string[] = [];
      try {
        const deletedCached = safeStorage.getItem('ciya_deleted_course_ids');
        if (deletedCached) {
          deletedIds = JSON.parse(deletedCached);
        }
      } catch (e) {}

      // Get local caches
      const localCachedStandard = safeStorage.getItem('ciya_frontend_courses');
      const localCachedAdvanced = safeStorage.getItem('ciya_frontend_advanced_courses');

      let localStandard: Course[] = [];
      let localAdvanced: Course[] = [];

      if (localCachedStandard) {
        try {
          const parsed = JSON.parse(localCachedStandard);
          if (Array.isArray(parsed)) localStandard = parsed.map(normalizeCourse);
        } catch (e) {}
      }
      if (localCachedAdvanced) {
        try {
          const parsed = JSON.parse(localCachedAdvanced);
          if (Array.isArray(parsed)) localAdvanced = parsed.map(normalizeCourse);
        } catch (e) {}
      }

      // Merge standard
      const standardMap = new Map<string, Course>();
      fetchedStandard.forEach(c => { if (!deletedIds.includes(c.id!)) standardMap.set(c.id!, c); });
      localStandard.forEach(c => {
        if (!deletedIds.includes(c.id!)) {
          const existing = standardMap.get(c.id!);
          if (!existing) {
            if (fetchedStandard.length === 0) {
              standardMap.set(c.id!, c);
            }
          } else {
            // Compare video completeness
            const serverVideoCount = existing.days?.reduce((acc, d) => acc + (d.videos?.length || 0), 0) || 0;
            const localVideoCount = c.days?.reduce((acc, d) => acc + (d.videos?.length || 0), 0) || 0;

            if (serverVideoCount > localVideoCount) {
              // Server has richer video content - retain server course
              standardMap.set(c.id!, existing);
            } else {
              // Apply smart Day 4/5 merging if needed
              const localDay4 = c.days?.find(d => d.dayNumber === 4);
              const serverDay4 = existing.days?.find(d => d.dayNumber === 4);
              const localDay4IsPlaceholder = !localDay4 || localDay4.title.toLowerCase().includes('core fundamentals') || !localDay4.description;
              const serverDay4IsReal = serverDay4 && serverDay4.title.toLowerCase().includes('prompt engineering');
              if (localDay4IsPlaceholder && serverDay4IsReal && c.days) {
                c.days = c.days.map(d => d.dayNumber === 4 ? serverDay4 : d);
                c.updatedAt = new Date().toISOString();
              }

              const localDay5 = c.days?.find(d => d.dayNumber === 5);
              const serverDay5 = existing.days?.find(d => d.dayNumber === 5);
              const localDay5IsPlaceholder = !localDay5 || localDay5.title.toLowerCase().includes('core fundamentals') || !localDay5.description;
              const serverDay5IsReal = serverDay5 && serverDay5.title.toLowerCase().includes('branding');
              if (localDay5IsPlaceholder && serverDay5IsReal && c.days) {
                c.days = c.days.map(d => d.dayNumber === 5 ? serverDay5 : d);
                c.updatedAt = new Date().toISOString();
              }

              const localTime = new Date(c.updatedAt || 0).getTime();
              const serverTime = new Date(existing.updatedAt || 0).getTime();
              if (localTime > serverTime) {
                standardMap.set(c.id!, c);
              }
            }
          }
        }
      });

      // Merge advanced
      const advancedMap = new Map<string, Course>();
      fetchedAdvanced.forEach(c => { if (!deletedIds.includes(c.id!)) advancedMap.set(c.id!, c); });
      localAdvanced.forEach(c => {
        if (!deletedIds.includes(c.id!)) {
          const existing = advancedMap.get(c.id!);
          if (!existing) {
            if (fetchedAdvanced.length === 0) {
              advancedMap.set(c.id!, c);
            }
          } else {
            const localTime = new Date(c.updatedAt || 0).getTime();
            const serverTime = new Date(existing.updatedAt || 0).getTime();
            if (localTime > serverTime) {
              advancedMap.set(c.id!, c);
            }
          }
        }
      });

      const finalStandard = Array.from(standardMap.values());
      const finalAdvanced = Array.from(advancedMap.values());

      // Save to cache
      safeStorage.setItem('ciya_frontend_courses', JSON.stringify(finalStandard));
      safeStorage.setItem('ciya_frontend_advanced_courses', JSON.stringify(finalAdvanced));

      const merged = [...finalStandard, ...finalAdvanced];
      window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: merged }));
      console.log(`Synchronization finished. standard: ${finalStandard.length}, advanced: ${finalAdvanced.length}`);

      // Sync back standard to backend disk
      fetch('/api/courses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: finalStandard })
      }).catch(() => {});

      // Sync back advanced to backend disk
      fetch('/api/advanced-courses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: finalAdvanced })
      }).catch(() => {});

    } catch (err) {
      console.error("Critical error during courses synchronization startup:", err);
    }
  })();
}
