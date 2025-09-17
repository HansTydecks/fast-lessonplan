// Globale Variablen
let phases = [];

// DOM Elements
const lessonTitleInput = document.getElementById('lesson-title');
const startTimeInput = document.getElementById('start-time');
const objectivesContainer = document.getElementById('objectives-container');
const phasesContainer = document.getElementById('phases-container');
const addPhaseBtn = document.getElementById('add-phase');
const exportPdfBtn = document.getElementById('export-pdf');
const exportJsonBtn = document.getElementById('export-json');
const importJsonBtn = document.getElementById('import-json');
const jsonFileInput = document.getElementById('json-file-input');
const phaseTemplate = document.getElementById('phase-template');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // Lernziele
    objectivesContainer.addEventListener('click', handleObjectiveClick);
    objectivesContainer.addEventListener('input', handleObjectiveInput);

    // Phasen
    addPhaseBtn.addEventListener('click', addPhase);
    phasesContainer.addEventListener('click', handlePhaseClick);
    phasesContainer.addEventListener('input', handlePhaseInput);

    // Export/Import
    exportPdfBtn.addEventListener('click', exportToPdf);
    exportJsonBtn.addEventListener('click', exportToJson);
    importJsonBtn.addEventListener('click', () => jsonFileInput.click());
    jsonFileInput.addEventListener('change', importFromJson);

    // Startzeit Änderung
    startTimeInput.addEventListener('change', updateAllTimeRanges);
}

// Lernziele Management
function addObjective() {
    const objectiveDiv = document.createElement('div');
    objectiveDiv.className = 'objective-item new';
    objectiveDiv.innerHTML = `
        <input type="text" class="objective-input" placeholder="Lernziel eingeben...">
        <button type="button" class="remove-objective">✕</button>
    `;
    
    objectivesContainer.appendChild(objectiveDiv);
    
    // Animation entfernen nach Ausführung
    setTimeout(() => objectiveDiv.classList.remove('new'), 300);
    
    updateObjectiveButtons();
}

function handleObjectiveClick(e) {
    if (e.target.classList.contains('remove-objective')) {
        e.target.parentElement.remove();
        updateObjectiveButtons();
    }
}

function handleObjectiveInput(e) {
    if (e.target.classList.contains('objective-input')) {
        updateObjectiveButtons();
        
        // Automatisch neues Feld hinzufügen wenn aktuelles Feld ausgefüllt wird
        const objectives = objectivesContainer.querySelectorAll('.objective-item');
        const lastObjective = objectives[objectives.length - 1];
        const lastInput = lastObjective.querySelector('.objective-input');
        
        // Nur hinzufügen wenn das letzte Feld ausgefüllt wird und noch kein leeres danach existiert
        if (e.target === lastInput && e.target.value.trim() !== '') {
            addObjective();
        }
    }
}

function updateObjectiveButtons() {
    const objectives = objectivesContainer.querySelectorAll('.objective-item');
    objectives.forEach((obj, index) => {
        const removeBtn = obj.querySelector('.remove-objective');
        
        // Erste Objective oder einzige behalten, Rest kann gelöscht werden wenn mehr als eine vorhanden
        if (objectives.length === 1) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.style.display = 'block';
        }
    });
}

// Phasen Management - KOMPLETT NEU GESCHRIEBEN
function addPhase() {
    console.log(`addPhase called - current phases: ${phasesContainer.children.length}`);
    
    // Erstelle das äußere Container-DIV
    const phaseDiv = document.createElement('div');
    phaseDiv.className = 'phase-item';
    
    // Klone den Template-INHALT (OHNE das äußere phase-item DIV aus dem Template)
    const template = phaseTemplate.content.cloneNode(true);
    phaseDiv.appendChild(template);
    
    // Füge zum Container hinzu
    phasesContainer.appendChild(phaseDiv);
    
    console.log(`addPhase: Phase added, total phases now: ${phasesContainer.children.length}`);
    
    // Nummerierung und Zeit NACH dem DOM-Update aktualisieren
    setTimeout(() => {
        updatePhaseNumbers();
        updateAllTimeRanges();
    }, 10);
}

function handlePhaseClick(e) {
    const phaseItem = e.target.closest('.phase-item');
    
    if (e.target.classList.contains('remove-phase')) {
        if (phasesContainer.children.length > 1) {
            phaseItem.remove();
            updatePhaseNumbers();
            updateAllTimeRanges();
        } else {
            showMessage('Mindestens eine Phase ist erforderlich.', 'error');
        }
    } else if (e.target.classList.contains('move-up')) {
        movePhase(phaseItem, 'up');
    } else if (e.target.classList.contains('move-down')) {
        movePhase(phaseItem, 'down');
    }
}

function handlePhaseInput(e) {
    if (e.target.classList.contains('duration-input')) {
        updateAllTimeRanges();
    }
}

function movePhase(phaseItem, direction) {
    const sibling = direction === 'up' ? 
        phaseItem.previousElementSibling : 
        phaseItem.nextElementSibling;
    
    if (sibling) {
        if (direction === 'up') {
            phasesContainer.insertBefore(phaseItem, sibling);
        } else {
            phasesContainer.insertBefore(sibling, phaseItem);
        }
        updatePhaseNumbers();
        updateAllTimeRanges();
    }
}

function updatePhaseNumbers() {
    const phases = phasesContainer.querySelectorAll('.phase-item');
    console.log(`updatePhaseNumbers: Found ${phases.length} phases to number`);
    
    phases.forEach((phase, index) => {
        const phaseNumber = phase.querySelector('.phase-number');
        if (phaseNumber) {
            phaseNumber.textContent = `Phase ${index + 1}`;
            console.log(`Updated phase ${index} to display "Phase ${index + 1}"`);
        } else {
            console.error(`Phase number element not found for phase ${index}`);
        }
    });
}

// Zeitberechnung
function updateAllTimeRanges() {
    const startTime = startTimeInput.value;
    if (!startTime) return;
    
    const phases = phasesContainer.querySelectorAll('.phase-item');
    let currentTime = parseTime(startTime);
    
    phases.forEach((phase, index) => {
        const durationInput = phase.querySelector('.duration-input');
        const timeRange = phase.querySelector('.time-range');
        
        if (!durationInput || !timeRange) {
            return;
        }
        
        const duration = parseInt(durationInput.value) || 0;
        const endTime = new Date(currentTime.getTime() + duration * 60000);
        
        timeRange.textContent = `${formatTime(currentTime)} - ${formatTime(endTime)}`;
        
        currentTime = endTime;
    });
}

function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

function formatTime(date) {
    return date.toTimeString().slice(0, 5);
}

// PDF Export
function exportToPdf() {
    try {
        // Sicherstellen dass jsPDF verfügbar ist
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF library not loaded');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Titel
        const lessonTitle = lessonTitleInput.value || 'Stundenverlaufsplan';
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(lessonTitle, 20, 20);
        
        // Lernziele
        const objectives = getObjectives().filter(obj => obj.trim() !== '');
        let currentY = 35;
        
        if (objectives.length > 0) {
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Lernziele:', 20, currentY);
            
            pdf.setFont('helvetica', 'normal');
            objectives.forEach((objective, index) => {
                currentY += 7;
                pdf.text(`• ${objective}`, 25, currentY);
            });
            currentY += 10;
        }
        
        // Tabelle erstellen
        const tableData = getPhaseTableData();
        
        // Sicherstellen dass autoTable verfügbar ist
        if (typeof pdf.autoTable !== 'function') {
            throw new Error('autoTable plugin not loaded');
        }
        
        pdf.autoTable({
            head: [['Zeit', 'Dauer', 'Thema/Sozialform', 'Durchführung', 'Material/Tafelbild']],
            body: tableData,
            startY: Math.max(currentY, 40),
            styles: {
                fontSize: 9,
                cellPadding: 3,
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
                0: { cellWidth: 25 },  // Zeit
                1: { cellWidth: 20 },  // Dauer
                2: { cellWidth: 45 },  // Thema/Sozialform (zusammengefasst)
                3: { cellWidth: 110 }, // Durchführung (mehr Platz!)
                4: { cellWidth: 55 }   // Material
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: 20, right: 20 }
        });
        
        // PDF speichern
        const fileName = lessonTitle.replace(/[^a-z0-9äöüß\s]/gi, '_').toLowerCase() || 'stundenverlaufsplan';
        const timestamp = new Date().toISOString().slice(0, 10);
        pdf.save(`${fileName}_${timestamp}.pdf`);
        
        showMessage('PDF wurde erfolgreich erstellt!', 'success');
    } catch (error) {
        console.error('Fehler beim PDF-Export:', error);
        showMessage(`Fehler beim PDF-Export: ${error.message}`, 'error');
    }
}

function getPhaseTableData() {
    const phases = phasesContainer.querySelectorAll('.phase-item');
    const tableData = [];
    
    console.log(`getPhaseTableData: Found ${phases.length} phases`);
    
    phases.forEach((phase, index) => {
        const timeRangeElement = phase.querySelector('.time-range');
        const durationElement = phase.querySelector('.duration-input');
        const socialFormElement = phase.querySelector('.social-form');
        const taskTitleElement = phase.querySelector('.task-title');
        const implementationElement = phase.querySelector('.implementation');
        const materialsElement = phase.querySelector('.materials');
        
        // Sicherstellen dass alle Elemente existieren
        if (!timeRangeElement || !durationElement || !socialFormElement || 
            !taskTitleElement || !implementationElement || !materialsElement) {
            console.warn(`Phase ${index} missing elements, skipping`);
            return;
        }
        
        const timeRange = timeRangeElement.textContent || '';
        const duration = (durationElement.value || '10') + ' Min';
        const socialForm = socialFormElement.value || '';
        const taskTitle = taskTitleElement.value || '';
        const implementation = implementationElement.value || '';
        const materials = materialsElement.value || '';
        
        // Thema und Sozialform zusammenfassen
        const themeAndSocialForm = taskTitle ? 
            `${taskTitle}\n(${socialForm})` : 
            `(${socialForm})`;
        
        console.log(`Phase ${index + 1}: ${timeRange} - ${taskTitle}`);
        
        tableData.push([
            timeRange,
            duration,
            themeAndSocialForm,  // Zusammengefasste Spalte
            implementation,
            materials
        ]);
    });
    
    console.log(`getPhaseTableData: Returning ${tableData.length} rows`);
    return tableData;
}

// JSON Export/Import
function exportToJson() {
    try {
        const data = {
            lessonTitle: lessonTitleInput.value || '',
            startTime: startTimeInput.value || '08:00',
            objectives: getObjectives().filter(obj => obj.trim() !== ''),
            phases: getPhases(),
            createdAt: new Date().toISOString(),
            version: "1.0"
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const fileName = (data.lessonTitle.replace(/[^a-z0-9äöüß\s]/gi, '_').toLowerCase() || 'stundenverlaufsplan');
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
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            loadDataFromJson(data);
            showMessage('JSON wurde erfolgreich geladen!', 'success');
        } catch (error) {
            console.error('Fehler beim JSON-Import:', error);
            showMessage('Fehler beim Laden der JSON-Datei. Bitte überprüfen Sie das Format.', 'error');
        }
    };
    reader.readAsText(file);
    
    e.target.value = '';
}

function loadDataFromJson(data) {
    lessonTitleInput.value = data.lessonTitle || '';
    startTimeInput.value = data.startTime || '08:00';
    
    clearObjectives();
    if (data.objectives && data.objectives.length > 0) {
        data.objectives.forEach((objective, index) => {
            if (index === 0) {
                objectivesContainer.querySelector('.objective-input').value = objective;
            } else {
                addObjective();
                const inputs = objectivesContainer.querySelectorAll('.objective-input');
                inputs[inputs.length - 1].value = objective;
            }
        });
    }
    
    clearPhases();
    if (data.phases && data.phases.length > 0) {
        data.phases.forEach((phaseData) => {
            addPhase();
            const phases = phasesContainer.querySelectorAll('.phase-item');
            loadPhaseData(phases[phases.length - 1], phaseData);
        });
    }
    
    updatePhaseNumbers();
    updateAllTimeRanges();
}

function loadPhaseData(phaseElement, data) {
    phaseElement.querySelector('.duration-input').value = data.duration || 10;
    phaseElement.querySelector('.social-form').value = data.socialForm || 'Plenum';
    phaseElement.querySelector('.task-title').value = data.taskTitle || '';
    phaseElement.querySelector('.implementation').value = data.implementation || '';
    phaseElement.querySelector('.materials').value = data.materials || '';
}

// Hilfsfunktionen
function getObjectives() {
    const inputs = objectivesContainer.querySelectorAll('.objective-input');
    return Array.from(inputs).map(input => input.value);
}

function getPhases() {
    const phases = phasesContainer.querySelectorAll('.phase-item');
    return Array.from(phases).map((phase) => {
        const durationElement = phase.querySelector('.duration-input');
        const socialFormElement = phase.querySelector('.social-form');
        const taskTitleElement = phase.querySelector('.task-title');
        const implementationElement = phase.querySelector('.implementation');
        const materialsElement = phase.querySelector('.materials');
        
        return {
            duration: parseInt(durationElement?.value) || 10,
            socialForm: socialFormElement?.value || 'Plenum',
            taskTitle: taskTitleElement?.value || '',
            implementation: implementationElement?.value || '',
            materials: materialsElement?.value || ''
        };
    });
}

function clearObjectives() {
    objectivesContainer.innerHTML = `
        <div class="objective-item">
            <input type="text" class="objective-input" placeholder="Lernziel eingeben...">
            <button type="button" class="remove-objective" style="display: none;">✕</button>
        </div>
    `;
}

function clearPhases() {
    phasesContainer.innerHTML = '';
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