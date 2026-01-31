// Stoffverteilungsplan JavaScript

// API Configuration
const FERIEN_API_BASE = 'https://www.mehr-schulferien.de/api/v2.1';

// Ferien-Cache
let cachedVacations = [];
let cachedHolidays = [];

// DOM Elements - werden in init() initialisiert
let subjectInput;
let classNameInput;
let schoolYearInput;
let teacherNameInput;
let federalStateSelect;
let startDateInput;
let totalLessonHoursInput;
let hoursPerWeekInput;
let weekdayCheckboxes;
let calculatedEndDateSpan;
let calculatedDaysSpan;
let excludedDaysSpan;
let excludeVacationsCheckbox;
let excludeHolidaysCheckbox;
let loadVacationsBtn;
let vacationDisplay;
let vacationList;
let generateDatesBtn;
let goalsContainer;
let distributionBody;
let addRowBtn;
let exportPdfBtn;
let exportJsonBtn;
let importJsonBtn;
let jsonFileInput;
let rowTemplate;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initDOMElements();
    setupEventListeners();
    setupAiPromptModal();
    setDefaultDates();
    loadCachedVacations();
    addRow(); // Start mit einer leeren Zeile
});

function initDOMElements() {
    subjectInput = document.getElementById('subject');
    classNameInput = document.getElementById('class-name');
    schoolYearInput = document.getElementById('school-year');
    teacherNameInput = document.getElementById('teacher-name');
    federalStateSelect = document.getElementById('federal-state');
    startDateInput = document.getElementById('start-date');
    totalLessonHoursInput = document.getElementById('total-lesson-hours');
    hoursPerWeekInput = document.getElementById('hours-per-week');
    weekdayCheckboxes = document.querySelectorAll('.weekday-checkbox input');
    calculatedEndDateSpan = document.getElementById('calculated-end-date');
    calculatedDaysSpan = document.getElementById('calculated-days');
    excludedDaysSpan = document.getElementById('excluded-days');
    excludeVacationsCheckbox = document.getElementById('exclude-vacations');
    excludeHolidaysCheckbox = document.getElementById('exclude-holidays');
    loadVacationsBtn = document.getElementById('load-vacations');
    vacationDisplay = document.getElementById('vacation-display');
    vacationList = document.getElementById('vacation-list');
    generateDatesBtn = document.getElementById('generate-dates');
    goalsContainer = document.getElementById('goals-container');
    distributionBody = document.getElementById('distribution-body');
    addRowBtn = document.getElementById('add-row');
    exportPdfBtn = document.getElementById('export-pdf');
    exportJsonBtn = document.getElementById('export-json');
    importJsonBtn = document.getElementById('import-json');
    jsonFileInput = document.getElementById('json-file-input');
    rowTemplate = document.getElementById('row-template');
}

function setupEventListeners() {
    // Zeit-Berechnung
    startDateInput.addEventListener('change', onDateOrStateChange);
    totalLessonHoursInput.addEventListener('input', calculateDays);
    hoursPerWeekInput.addEventListener('input', calculateDays);
    weekdayCheckboxes.forEach(cb => cb.addEventListener('change', calculateDays));
    federalStateSelect.addEventListener('change', onDateOrStateChange);
    
    // Ferien-Optionen
    loadVacationsBtn.addEventListener('click', loadVacations);
    excludeVacationsCheckbox.addEventListener('change', calculateDays);
    excludeHolidaysCheckbox.addEventListener('change', calculateDays);
    
    // Termine generieren
    generateDatesBtn.addEventListener('click', generateDates);
    
    // Lernziele
    goalsContainer.addEventListener('click', handleGoalClick);
    goalsContainer.addEventListener('input', handleGoalInput);
    
    // Tabelle
    addRowBtn.addEventListener('click', addRow);
    distributionBody.addEventListener('click', handleRowClick);
    
    // Export/Import
    exportPdfBtn.addEventListener('click', exportToPdf);
    exportJsonBtn.addEventListener('click', exportToJson);
    importJsonBtn.addEventListener('click', () => jsonFileInput.click());
    jsonFileInput.addEventListener('change', importFromJson);
}

// ==========================================
// SCHULFERIEN API FUNCTIONS
// ==========================================

async function fetchSchulferien(bundeslandSlug, startDate, endDate) {
    const cacheKey = `ferien_${bundeslandSlug}_${startDate}_${endDate}`;
    
    // Check localStorage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const data = JSON.parse(cached);
        // Cache für 24 Stunden gültig
        if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
            console.log('Ferien aus Cache geladen');
            return data.periods;
        }
    }
    
    try {
        const url = `${FERIEN_API_BASE}/federal-states/${bundeslandSlug}/periods?start_date=${startDate}&end_date=${endDate}`;
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API Fehler: ${response.status}`);
        }
        
        const result = await response.json();
        const periods = result.data || [];
        
        // Cache speichern
        localStorage.setItem(cacheKey, JSON.stringify({
            periods: periods,
            timestamp: Date.now()
        }));
        
        return periods;
    } catch (error) {
        console.error('Fehler beim Abrufen der Ferien:', error);
        throw error;
    }
}

async function loadVacations() {
    const bundesland = federalStateSelect.value;
    const startDate = startDateInput.value;
    
    if (!bundesland) {
        showMessage('Bitte wählen Sie ein Bundesland aus.', 'error');
        return;
    }
    
    if (!startDate) {
        showMessage('Bitte Startdatum eingeben.', 'error');
        return;
    }
    
    // Berechne ein großzügiges Enddatum für die API (1 Jahr ab Start)
    const start = new Date(startDate);
    const endDateForApi = new Date(start);
    endDateForApi.setFullYear(endDateForApi.getFullYear() + 1);
    const endDateStr = endDateForApi.toISOString().split('T')[0];
    
    loadVacationsBtn.disabled = true;
    loadVacationsBtn.textContent = '⏳ Lädt...';
    
    try {
        const periods = await fetchSchulferien(bundesland, startDate, endDateStr);
        
        // Separiere Ferien und Feiertage
        cachedVacations = periods.filter(p => p.is_school_vacation);
        cachedHolidays = periods.filter(p => p.is_public_holiday);
        
        displayVacations();
        calculateDays();
        
        const totalPeriods = cachedVacations.length + cachedHolidays.length;
        showMessage(`${cachedVacations.length} Ferienzeiten und ${cachedHolidays.length} Feiertage geladen!`, 'success');
        
    } catch (error) {
        showMessage(`Fehler beim Laden der Ferien: ${error.message}. Termine werden ohne Ferienfilter berechnet.`, 'error');
        cachedVacations = [];
        cachedHolidays = [];
    } finally {
        loadVacationsBtn.disabled = false;
        loadVacationsBtn.textContent = '🔄 Ferien laden';
    }
}

function displayVacations() {
    if (cachedVacations.length === 0 && cachedHolidays.length === 0) {
        vacationDisplay.style.display = 'none';
        return;
    }
    
    vacationDisplay.style.display = 'block';
    vacationList.innerHTML = '';
    
    // Ferien anzeigen
    if (cachedVacations.length > 0) {
        const ferienSection = document.createElement('div');
        ferienSection.className = 'vacation-section';
        ferienSection.innerHTML = '<strong>🏖️ Schulferien:</strong>';
        
        cachedVacations.forEach(v => {
            const item = document.createElement('span');
            item.className = 'vacation-item vacation';
            item.textContent = `${v.name}: ${formatDateDE(v.starts_on)} - ${formatDateDE(v.ends_on)}`;
            ferienSection.appendChild(item);
        });
        
        vacationList.appendChild(ferienSection);
    }
    
    // Feiertage anzeigen
    if (cachedHolidays.length > 0) {
        const feiertageSection = document.createElement('div');
        feiertageSection.className = 'vacation-section';
        feiertageSection.innerHTML = '<strong>🎉 Feiertage:</strong>';
        
        cachedHolidays.forEach(h => {
            const item = document.createElement('span');
            item.className = 'vacation-item holiday';
            item.textContent = `${h.name}: ${formatDateDE(h.starts_on)}`;
            feiertageSection.appendChild(item);
        });
        
        vacationList.appendChild(feiertageSection);
    }
}

function loadCachedVacations() {
    // Versuche gecachte Daten zu laden wenn Bundesland gespeichert
    const savedState = localStorage.getItem('lastFederalState');
    if (savedState) {
        federalStateSelect.value = savedState;
    }
}

function onDateOrStateChange() {
    // Speichere Bundesland-Auswahl
    if (federalStateSelect.value) {
        localStorage.setItem('lastFederalState', federalStateSelect.value);
    }
    
    // Cache invalidieren wenn sich Datum oder Bundesland ändert
    cachedVacations = [];
    cachedHolidays = [];
    vacationDisplay.style.display = 'none';
    
    calculateDays();
}

function isDateInVacation(date) {
    if (!excludeVacationsCheckbox.checked) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    
    return cachedVacations.some(v => {
        return dateStr >= v.starts_on && dateStr <= v.ends_on;
    });
}

function isDateHoliday(date) {
    if (!excludeHolidaysCheckbox.checked) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    
    return cachedHolidays.some(h => {
        return dateStr >= h.starts_on && dateStr <= h.ends_on;
    });
}

function isDateExcluded(date) {
    return isDateInVacation(date) || isDateHoliday(date);
}

function formatDateDE(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ==========================================
// ORIGINAL FUNCTIONS (UPDATED)
// ==========================================

function setDefaultDates() {
    const today = new Date();
    // Nächsten Montag als Standard-Startdatum
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    
    startDateInput.value = nextMonday.toISOString().split('T')[0];
    
    // Schuljahr-Feld vorausfüllen
    const year = today.getFullYear();
    const month = today.getMonth();
    let startYear = month >= 7 ? year : year - 1;
    schoolYearInput.value = `${startYear}/${startYear + 1}`;
    
    calculateDays();
}

function calculateDays() {
    const startDate = new Date(startDateInput.value);
    const totalLessonHours = parseInt(totalLessonHoursInput.value) || 0;
    const hoursPerWeek = parseInt(hoursPerWeekInput.value) || 1;
    
    if (!startDateInput.value || totalLessonHours <= 0) {
        calculatedEndDateSpan.textContent = '--';
        calculatedDaysSpan.textContent = '0';
        excludedDaysSpan.textContent = '0';
        return;
    }
    
    const selectedDays = Array.from(weekdayCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));
    
    if (selectedDays.length === 0) {
        calculatedEndDateSpan.textContent = '--';
        calculatedDaysSpan.textContent = '0';
        excludedDaysSpan.textContent = '0';
        return;
    }
    
    // Berechne wie viele Stunden pro Unterrichtstag
    const hoursPerDay = Math.ceil(hoursPerWeek / selectedDays.length);
    
    // Berechne wie viele Unterrichtstermine benötigt werden
    const requiredDays = Math.ceil(totalLessonHours / hoursPerDay);
    
    let count = 0;
    let excludedCount = 0;
    let currentDate = new Date(startDate);
    let endDate = null;
    
    // Maximal 2 Jahre in die Zukunft suchen
    const maxDate = new Date(startDate);
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    
    while (count < requiredDays && currentDate <= maxDate) {
        const dayOfWeek = currentDate.getDay();
        // Konvertiere JavaScript-Wochentag (0=So, 1=Mo, ...) zu unserem Format (1=Mo, ..., 5=Fr)
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        if (selectedDays.includes(adjustedDay)) {
            if (isDateExcluded(currentDate)) {
                excludedCount++;
            } else {
                count++;
                endDate = new Date(currentDate);
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    calculatedDaysSpan.textContent = count;
    excludedDaysSpan.textContent = excludedCount;
    
    // Berechnetes Enddatum anzeigen
    if (endDate) {
        calculatedEndDateSpan.textContent = endDate.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    } else {
        calculatedEndDateSpan.textContent = '--';
    }
}

async function generateDates() {
    const startDate = new Date(startDateInput.value);
    const totalLessonHours = parseInt(totalLessonHoursInput.value) || 0;
    const hoursPerWeek = parseInt(hoursPerWeekInput.value) || 1;
    const bundesland = federalStateSelect.value;
    
    if (!startDateInput.value || totalLessonHours <= 0) {
        showMessage('Bitte gültiges Startdatum und Gesamtstunden eingeben.', 'error');
        return;
    }
    
    const selectedDays = Array.from(weekdayCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));
    
    if (selectedDays.length === 0) {
        showMessage('Bitte mindestens einen Unterrichtstag auswählen.', 'error');
        return;
    }
    
    // Wenn Bundesland ausgewählt und Ferien noch nicht geladen, automatisch laden
    if (bundesland && cachedVacations.length === 0 && cachedHolidays.length === 0) {
        if (excludeVacationsCheckbox.checked || excludeHolidaysCheckbox.checked) {
            try {
                generateDatesBtn.disabled = true;
                generateDatesBtn.textContent = '⏳ Lade Ferien...';
                await loadVacations();
            } catch (error) {
                // Weiter ohne Ferien
            } finally {
                generateDatesBtn.disabled = false;
                generateDatesBtn.textContent = '📅 Termine generieren';
            }
        }
    }
    
    // Bestehende Einträge löschen
    distributionBody.innerHTML = '';
    
    let currentDate = new Date(startDate);
    const hoursPerDay = Math.ceil(hoursPerWeek / selectedDays.length);
    const requiredDays = Math.ceil(totalLessonHours / hoursPerDay);
    
    let generatedCount = 0;
    let skippedCount = 0;
    let hoursGenerated = 0;
    
    // Maximal 2 Jahre in die Zukunft suchen
    const maxDate = new Date(startDate);
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    
    while (generatedCount < requiredDays && currentDate <= maxDate) {
        const dayOfWeek = currentDate.getDay();
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        if (selectedDays.includes(adjustedDay)) {
            if (isDateExcluded(currentDate)) {
                skippedCount++;
            } else {
                // Berechne Stunden für diesen Tag (evtl. weniger beim letzten Tag)
                const remainingHours = totalLessonHours - hoursGenerated;
                const hoursThisDay = Math.min(hoursPerDay, remainingHours);
                
                addRow(new Date(currentDate), hoursThisDay);
                generatedCount++;
                hoursGenerated += hoursThisDay;
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    let message = `${generatedCount} Termine mit insgesamt ${hoursGenerated} Stunden generiert!`;
    if (skippedCount > 0) {
        message += ` (${skippedCount} Tage wegen Ferien/Feiertagen übersprungen)`;
    }
    showMessage(message, 'success');
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function addRow(date = null, hours = 1) {
    const template = rowTemplate.content.cloneNode(true);
    const row = template.querySelector('tr');
    
    if (date) {
        const dateStr = date.toISOString().split('T')[0];
        row.querySelector('.date-input').value = dateStr;
        row.querySelector('.week-input').value = getWeekNumber(date);
        row.querySelector('.hours-input').value = hours;
    }
    
    distributionBody.appendChild(row);
    updateRowButtons();
}

function handleRowClick(e) {
    const row = e.target.closest('tr');
    
    if (e.target.classList.contains('remove-row')) {
        if (distributionBody.children.length > 1) {
            row.remove();
            updateRowButtons();
        } else {
            showMessage('Mindestens eine Zeile ist erforderlich.', 'error');
        }
    } else if (e.target.classList.contains('move-up-row')) {
        const prevRow = row.previousElementSibling;
        if (prevRow) {
            distributionBody.insertBefore(row, prevRow);
        }
    } else if (e.target.classList.contains('move-down-row')) {
        const nextRow = row.nextElementSibling;
        if (nextRow) {
            distributionBody.insertBefore(nextRow, row);
        }
    }
}

function updateRowButtons() {
    const rows = distributionBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const removeBtn = row.querySelector('.remove-row');
        if (rows.length === 1) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.style.display = 'block';
        }
    });
}

// Lernziele Management
function handleGoalClick(e) {
    if (e.target.classList.contains('remove-goal')) {
        e.target.parentElement.remove();
        updateGoalButtons();
    }
}

function handleGoalInput(e) {
    if (e.target.classList.contains('goal-input')) {
        updateGoalButtons();
        
        const goals = goalsContainer.querySelectorAll('.goal-item');
        const lastGoal = goals[goals.length - 1];
        const lastInput = lastGoal.querySelector('.goal-input');
        
        if (e.target === lastInput && e.target.value.trim() !== '') {
            addGoal();
        }
    }
}

function addGoal() {
    const goalDiv = document.createElement('div');
    goalDiv.className = 'goal-item';
    goalDiv.innerHTML = `
        <input type="text" class="goal-input" placeholder="Lernziel / Kompetenz eingeben...">
        <button type="button" class="remove-goal">✕</button>
    `;
    goalsContainer.appendChild(goalDiv);
    updateGoalButtons();
}

function updateGoalButtons() {
    const goals = goalsContainer.querySelectorAll('.goal-item');
    goals.forEach((goal) => {
        const removeBtn = goal.querySelector('.remove-goal');
        if (goals.length === 1) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.style.display = 'block';
        }
    });
}

// Export/Import Funktionen
function exportToPdf() {
    try {
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Titel
        const subject = subjectInput.value || 'Fach';
        const className = classNameInput.value || 'Klasse';
        const schoolYear = schoolYearInput.value || 'Schuljahr';
        const teacherName = teacherNameInput.value || '';
        
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Stoffverteilungsplan: ${subject}`, 20, 15);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Klasse: ${className} | Schuljahr: ${schoolYear}${teacherName ? ' | Lehrkraft: ' + teacherName : ''}`, 20, 23);
        
        // Lernziele
        const goals = getGoals().filter(g => g.trim() !== '');
        let currentY = 32;
        
        if (goals.length > 0) {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Jahresziele / Kompetenzen:', 20, currentY);
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            goals.forEach((goal) => {
                currentY += 5;
                pdf.text(`• ${goal}`, 25, currentY);
            });
            currentY += 8;
        }
        
        // Tabelle
        const tableData = getTableData();
        
        if (typeof pdf.autoTable !== 'function') {
            throw new Error('autoTable plugin not loaded');
        }
        
        pdf.autoTable({
            head: [['KW', 'Datum', 'Std.', 'Thema / Inhalt', 'Lernziele', 'Methoden', 'Leistungskontrolle']],
            body: tableData,
            startY: currentY,
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak',
                halign: 'left',
                valign: 'top'
            },
            headStyles: {
                fillColor: [70, 70, 70],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 12 },  // KW
                1: { cellWidth: 22 },  // Datum
                2: { cellWidth: 12 },  // Std
                3: { cellWidth: 60 },  // Thema
                4: { cellWidth: 50 },  // Lernziele
                5: { cellWidth: 50 },  // Methoden
                6: { cellWidth: 35 }   // Leistungskontrolle
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 15, right: 15 }
        });
        
        // PDF speichern
        const fileName = `stoffverteilungsplan_${subject}_${className}`.replace(/[^a-z0-9äöüß\s]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().slice(0, 10);
        pdf.save(`${fileName}_${timestamp}.pdf`);
        
        showMessage('PDF wurde erfolgreich erstellt!', 'success');
    } catch (error) {
        console.error('Fehler beim PDF-Export:', error);
        showMessage(`Fehler beim PDF-Export: ${error.message}`, 'error');
    }
}

function getTableData() {
    const rows = distributionBody.querySelectorAll('tr');
    const tableData = [];
    
    rows.forEach((row) => {
        const week = row.querySelector('.week-input').value || '';
        const dateInput = row.querySelector('.date-input').value;
        const date = dateInput ? new Date(dateInput).toLocaleDateString('de-DE') : '';
        const hours = row.querySelector('.hours-input').value || '';
        const topic = row.querySelector('.topic-input').value || '';
        const goals = row.querySelector('.goals-input').value || '';
        const methods = row.querySelector('.methods-input').value || '';
        const assessment = row.querySelector('.assessment-select').value || '';
        
        tableData.push([week, date, hours, topic, goals, methods, assessment]);
    });
    
    return tableData;
}

function getGoals() {
    const inputs = goalsContainer.querySelectorAll('.goal-input');
    return Array.from(inputs).map(input => input.value);
}

function getRowData() {
    const rows = distributionBody.querySelectorAll('tr');
    return Array.from(rows).map((row) => ({
        week: row.querySelector('.week-input').value || '',
        date: row.querySelector('.date-input').value || '',
        hours: parseInt(row.querySelector('.hours-input').value) || 1,
        topic: row.querySelector('.topic-input').value || '',
        goals: row.querySelector('.goals-input').value || '',
        methods: row.querySelector('.methods-input').value || '',
        assessment: row.querySelector('.assessment-select').value || ''
    }));
}

function exportToJson() {
    try {
        const data = {
            type: 'stoffverteilungsplan',
            subject: subjectInput.value || '',
            className: classNameInput.value || '',
            schoolYear: schoolYearInput.value || '',
            teacherName: teacherNameInput.value || '',
            federalState: federalStateSelect.value || '',
            startDate: startDateInput.value || '',
            totalLessonHours: parseInt(totalLessonHoursInput.value) || 8,
            hoursPerWeek: parseInt(hoursPerWeekInput.value) || 2,
            weekdays: Array.from(weekdayCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value)),
            excludeVacations: excludeVacationsCheckbox.checked,
            excludeHolidays: excludeHolidaysCheckbox.checked,
            goals: getGoals().filter(g => g.trim() !== ''),
            rows: getRowData(),
            createdAt: new Date().toISOString(),
            version: "2.0"
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const fileName = `stoffverteilungsplan_${data.subject}_${data.className}`.replace(/[^a-z0-9äöüß\s]/gi, '_').toLowerCase() || 'stoffverteilungsplan';
        const timestamp = new Date().toISOString().slice(0, 10);
        a.download = `${fileName}_${timestamp}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        showMessage('JSON wurde erfolgreich gespeichert!', 'success');
    } catch (error) {
        console.error('Fehler beim JSON-Export:', error);
        showMessage(`Fehler beim JSON-Export: ${error.message}`, 'error');
    }
}

function importFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            // Unterstütze beide Formate: vollständig und nur Inhalte
            if (data.type === 'stoffverteilungsplan-content') {
                // Neues Format: Nur Inhalte von KI, Termine werden automatisch generiert
                await loadContentFromJson(data);
                showMessage('Inhalte wurden geladen und Termine automatisch berechnet!', 'success');
            } else if (data.type === 'stoffverteilungsplan') {
                // Altes Format: Vollständige Daten
                loadDataFromJson(data);
                showMessage('JSON wurde erfolgreich geladen!', 'success');
            } else {
                throw new Error('Diese Datei ist kein Stoffverteilungsplan.');
            }
        } catch (error) {
            console.error('Fehler beim JSON-Import:', error);
            showMessage(`Fehler beim Laden: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
    
    e.target.value = '';
}

// Neue Funktion: Lädt nur Inhalte und generiert Termine automatisch
async function loadContentFromJson(data) {
    // Grunddaten von KI übernehmen (falls vorhanden)
    if (data.subject) subjectInput.value = data.subject;
    if (data.className) classNameInput.value = data.className;
    if (data.schoolYear) schoolYearInput.value = data.schoolYear;
    if (data.teacherName) teacherNameInput.value = data.teacherName;
    
    // Lernziele übernehmen
    goalsContainer.innerHTML = '';
    if (data.goals && data.goals.length > 0) {
        data.goals.forEach((goal, index) => {
            const goalDiv = document.createElement('div');
            goalDiv.className = 'goal-item';
            goalDiv.innerHTML = `
                <input type="text" class="goal-input" placeholder="Lernziel / Kompetenz eingeben..." value="${escapeHtml(goal)}">
                <button type="button" class="remove-goal" style="display: ${data.goals.length > 1 ? 'block' : 'none'};">✕</button>
            `;
            goalsContainer.appendChild(goalDiv);
        });
    }
    
    // Anzahl der Inhalte bestimmt die benötigten Termine
    const contentItems = data.content || [];
    if (contentItems.length === 0) {
        showMessage('Keine Inhalte in der JSON-Datei gefunden.', 'error');
        return;
    }
    
    // Stelle sicher, dass Ferien geladen sind
    const bundesland = federalStateSelect.value;
    if (bundesland && cachedVacations.length === 0 && cachedHolidays.length === 0) {
        if (excludeVacationsCheckbox.checked || excludeHolidaysCheckbox.checked) {
            try {
                await loadVacations();
            } catch (error) {
                // Weiter ohne Ferien
            }
        }
    }
    
    // Termine generieren basierend auf den aktuellen Einstellungen
    const startDate = new Date(startDateInput.value);
    const hoursPerWeek = parseInt(hoursPerWeekInput.value) || 1;
    
    if (!startDateInput.value) {
        showMessage('Bitte zuerst ein Startdatum eingeben.', 'error');
        return;
    }
    
    const selectedDays = Array.from(weekdayCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));
    
    if (selectedDays.length === 0) {
        showMessage('Bitte mindestens einen Unterrichtstag auswählen.', 'error');
        return;
    }
    
    // Tabelle leeren
    distributionBody.innerHTML = '';
    
    const hoursPerDay = Math.ceil(hoursPerWeek / selectedDays.length);
    let currentDate = new Date(startDate);
    let contentIndex = 0;
    
    // Maximal 2 Jahre suchen
    const maxDate = new Date(startDate);
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    
    while (contentIndex < contentItems.length && currentDate <= maxDate) {
        const dayOfWeek = currentDate.getDay();
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        if (selectedDays.includes(adjustedDay)) {
            if (!isDateExcluded(currentDate)) {
                // Termin gefunden - Zeile erstellen mit Inhalt
                const content = contentItems[contentIndex];
                const template = rowTemplate.content.cloneNode(true);
                const row = template.querySelector('tr');
                
                row.querySelector('.week-input').value = getWeekNumber(currentDate);
                row.querySelector('.date-input').value = currentDate.toISOString().split('T')[0];
                row.querySelector('.hours-input').value = hoursPerDay;
                row.querySelector('.topic-input').value = content.topic || '';
                row.querySelector('.goals-input').value = content.goals || '';
                row.querySelector('.methods-input').value = content.methods || '';
                row.querySelector('.assessment-select').value = content.assessment || '';
                
                distributionBody.appendChild(row);
                contentIndex++;
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Gesamtstunden aktualisieren
    totalLessonHoursInput.value = contentItems.length * hoursPerDay;
    
    updateRowButtons();
    calculateDays();
}

function loadDataFromJson(data) {
    // Grunddaten laden
    subjectInput.value = data.subject || '';
    classNameInput.value = data.className || '';
    schoolYearInput.value = data.schoolYear || '';
    teacherNameInput.value = data.teacherName || '';
    federalStateSelect.value = data.federalState || '';
    startDateInput.value = data.startDate || '';
    
    // Kompatibilität: totalLessonHours (neu) oder fallback
    if (data.totalLessonHours) {
        totalLessonHoursInput.value = data.totalLessonHours;
    } else {
        totalLessonHoursInput.value = 8; // Standardwert
    }
    
    hoursPerWeekInput.value = data.hoursPerWeek || 2;
    
    // Ferien-Optionen
    if (typeof data.excludeVacations !== 'undefined') {
        excludeVacationsCheckbox.checked = data.excludeVacations;
    }
    if (typeof data.excludeHolidays !== 'undefined') {
        excludeHolidaysCheckbox.checked = data.excludeHolidays;
    }
    
    // Wochentage
    weekdayCheckboxes.forEach(cb => {
        cb.checked = data.weekdays && data.weekdays.includes(parseInt(cb.value));
    });
    
    // Lernziele
    goalsContainer.innerHTML = '';
    if (data.goals && data.goals.length > 0) {
        data.goals.forEach((goal, index) => {
            const goalDiv = document.createElement('div');
            goalDiv.className = 'goal-item';
            goalDiv.innerHTML = `
                <input type="text" class="goal-input" placeholder="Lernziel / Kompetenz eingeben..." value="${escapeHtml(goal)}">
                <button type="button" class="remove-goal" style="display: ${data.goals.length > 1 ? 'block' : 'none'};">✕</button>
            `;
            goalsContainer.appendChild(goalDiv);
        });
    } else {
        const goalDiv = document.createElement('div');
        goalDiv.className = 'goal-item';
        goalDiv.innerHTML = `
            <input type="text" class="goal-input" placeholder="Lernziel / Kompetenz eingeben...">
            <button type="button" class="remove-goal" style="display: none;">✕</button>
        `;
        goalsContainer.appendChild(goalDiv);
    }
    
    // Tabellenzeilen
    distributionBody.innerHTML = '';
    if (data.rows && data.rows.length > 0) {
        data.rows.forEach((rowData) => {
            const template = rowTemplate.content.cloneNode(true);
            const row = template.querySelector('tr');
            
            row.querySelector('.week-input').value = rowData.week || '';
            row.querySelector('.date-input').value = rowData.date || '';
            row.querySelector('.hours-input').value = rowData.hours || 1;
            row.querySelector('.topic-input').value = rowData.topic || '';
            row.querySelector('.goals-input').value = rowData.goals || '';
            row.querySelector('.methods-input').value = rowData.methods || '';
            row.querySelector('.assessment-select').value = rowData.assessment || '';
            
            distributionBody.appendChild(row);
        });
    } else {
        addRow();
    }
    
    updateRowButtons();
    calculateDays();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type) {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    const container = document.querySelector('.container');
    container.insertBefore(message, container.firstChild);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 5000);
}

// KI-Prompt Modal Funktionalität
function setupAiPromptModal() {
    const aiPromptBtn = document.getElementById('ai-prompt-btn');
    const modal = document.getElementById('ai-prompt-modal');
    const closeBtn = modal.querySelector('.close');
    const copyBtn = document.getElementById('copy-prompt');
    const closeModalBtns = modal.querySelectorAll('.close-modal');

    // Modal öffnen
    aiPromptBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    // Modal schließen - X Button
    closeBtn.addEventListener('click', function() {
        closeAiModal();
    });

    // Modal schließen - Schließen Buttons
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            closeAiModal();
        });
    });

    // Modal schließen bei Klick außerhalb
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeAiModal();
        }
    });

    // ESC Taste zum Schließen
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeAiModal();
        }
    });

    function closeAiModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Prompt kopieren
    copyBtn.addEventListener('click', async function() {
        const promptText = document.getElementById('ai-prompt-text');
        try {
            await navigator.clipboard.writeText(promptText.value);
            
            // Feedback für erfolgreiches Kopieren
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Kopiert!';
            copyBtn.style.background = 'linear-gradient(135deg, #4caf50, #45a049)';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = 'linear-gradient(135deg, var(--accent-color), #9d4edd)';
            }, 2000);
        } catch (err) {
            // Fallback für ältere Browser
            promptText.select();
            document.execCommand('copy');
            
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Kopiert!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    });
}
