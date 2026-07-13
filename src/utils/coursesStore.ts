import { Course } from '../types';
import { safeStorage } from './safeStorage';
import staticCourses from '../data/courses.json';

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
  getCourses(): Course[] {
    const cached = safeStorage.getItem('ciya_frontend_courses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing frontend courses from storage:", e);
      }
    }

    // Initialize with normalized static courses
    const initial = (staticCourses as any[]).map(normalizeCourse);
    this.saveAll(initial);
    return initial;
  },

  async saveAll(courses: Course[]): Promise<void> {
    try {
      safeStorage.setItem('ciya_frontend_courses', JSON.stringify(courses));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: courses }));
        
        // Save to backend files (courses.json)
        fetch('/api/courses/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ courses })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("Successfully updated courses.json on disk.");
          } else {
            console.error("Failed to update courses.json on disk:", data.error);
          }
        })
        .catch(err => {
          console.warn("Unable to save courses.json on disk (offline or server not active):", err);
        });
      }
      return Promise.resolve();
    } catch (e) {
      console.error("Failed to save courses to safeStorage:", e);
      return Promise.reject(e);
    }
  },

  saveCourse(course: Course): Promise<void> {
    const current = this.getCourses();
    
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
    return this.saveAll(current);
  },

  async deleteCourse(courseId: string): Promise<void> {
    const current = this.getCourses();
    const filtered = current.filter(c => c.id !== courseId);
    
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

    return this.saveAll(filtered);
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

    const current = this.getCourses();
    current.push(cloned);
    return this.saveAll(current).then(() => cloned);
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
      
      let fetchedCourses: Course[] = [];

      // 1. Fetch from server disk api /api/courses
      try {
        const res = await fetch(`/api/courses?t=${Date.now()}`);
        if (res.ok) {
          const serverCourses = await res.json();
          if (Array.isArray(serverCourses) && serverCourses.length > 0) {
            fetchedCourses = serverCourses.map(normalizeCourse);
            console.log(`Loaded ${fetchedCourses.length} courses from server courses.json file.`);
          }
        }
      } catch (serverErr) {
        console.warn("Unable to load courses from server disk on startup:", serverErr);
      }

      // 2. If server API failed or returned empty, use static fallback
      if (fetchedCourses.length === 0) {
        fetchedCourses = (staticCourses as any[]).map(normalizeCourse);
      }

      // 3. Get existing local courses
      const localCached = safeStorage.getItem('ciya_frontend_courses');
      let localCourses: Course[] = [];
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed)) {
            localCourses = parsed.map(normalizeCourse);
          }
        } catch (e) {}
      }

      // 4. Get deleted course IDs
      let deletedIds: string[] = [];
      try {
        const deletedCached = safeStorage.getItem('ciya_deleted_course_ids');
        if (deletedCached) {
          deletedIds = JSON.parse(deletedCached);
        }
      } catch (e) {}

      // 5. Merge server courses and local courses
      const mergedMap = new Map<string, Course>();
      
      // Add server courses
      fetchedCourses.forEach(c => {
        if (!deletedIds.includes(c.id)) {
          mergedMap.set(c.id, c);
        }
      });

      // Overlay with local courses (preferring newer updatedAt)
      localCourses.forEach(c => {
        if (!deletedIds.includes(c.id)) {
          const existing = mergedMap.get(c.id);
          if (!existing) {
            mergedMap.set(c.id, c);
          } else {
            // Smart Check: If local version has placeholder/empty Day 4 but server has real Day 4 content,
            // we merge the server's real Day 4 into the local course so they get the update without losing other changes!
            const localDay4 = c.days?.find(d => d.dayNumber === 4);
            const serverDay4 = existing.days?.find(d => d.dayNumber === 4);
            const localDay4IsPlaceholder = !localDay4 || localDay4.title.toLowerCase().includes('core fundamentals') || !localDay4.description;
            const serverDay4IsReal = serverDay4 && serverDay4.title.toLowerCase().includes('prompt engineering');

            if (localDay4IsPlaceholder && serverDay4IsReal && c.days) {
              console.log(`Smart merge: Replacing placeholder Day 4 of course ${c.id} with updated server Prompt Engineering content.`);
              c.days = c.days.map(d => d.dayNumber === 4 ? serverDay4 : d);
              c.updatedAt = new Date().toISOString();
            }

            // Smart Check: If local version has placeholder/empty Day 5 but server has real Day 5 content,
            // we merge the server's real Day 5 into the local course so they get the update without losing other changes!
            const localDay5 = c.days?.find(d => d.dayNumber === 5);
            const serverDay5 = existing.days?.find(d => d.dayNumber === 5);
            const localDay5IsPlaceholder = !localDay5 || localDay5.title.toLowerCase().includes('core fundamentals') || !localDay5.description;
            const serverDay5IsReal = serverDay5 && serverDay5.title.toLowerCase().includes('branding');

            if (localDay5IsPlaceholder && serverDay5IsReal && c.days) {
              console.log(`Smart merge: Replacing placeholder Day 5 of course ${c.id} with updated server branding content.`);
              c.days = c.days.map(d => d.dayNumber === 5 ? serverDay5 : d);
              c.updatedAt = new Date().toISOString();
            }

            const localTime = new Date(c.updatedAt || 0).getTime();
            const serverTime = new Date(existing.updatedAt || 0).getTime();
            if (localTime > serverTime) {
              mergedMap.set(c.id, c);
            }
          }
        }
      });

      const finalCourses = Array.from(mergedMap.values());

      // 6. Update local storage and broadcast to UI
      safeStorage.setItem('ciya_frontend_courses', JSON.stringify(finalCourses));
      window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: finalCourses }));
      console.log(`Courses synchronized and merged successfully. Total courses in view: ${finalCourses.length}`);

      // 7. Save back to the backend disk courses.json so that the server has the merged version
      fetch('/api/courses/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ courses: finalCourses })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log("Updated server disk courses.json with merged courses.");
        }
      })
      .catch(() => {});

    } catch (err) {
      console.error("Critical error during courses synchronization startup:", err);
    }
  })();
}
