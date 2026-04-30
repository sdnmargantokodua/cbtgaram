// js/services/store.js
export const state = {
    allResults: [],
    allQuestions: [],
    examSchedules: [],
    examParticipants: [],
    masterSubjects: [], // Tambahkan ini
    allMajors: [],      // Tambahkan ini
    academicConfig: { years: [], activeSemester: 'Ganjil' }, // Tambahkan ini
    schoolProfile: {},
    currentSubject: "Pendidikan Pancasila",
    allSubjectsSet: new Set(["Pendidikan Pancasila"]),
    ADMIN_PIN: "ADMIN2026"
};
