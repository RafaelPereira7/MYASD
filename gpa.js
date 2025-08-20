$(function() {
  const gradeMap = {
    "A+": 4.0, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "D-": 0.7,
    "F": 0.0,
  };
  const STORAGE_KEY = 'gpa-premium-classes-v1';
  const TREND_KEY = 'gpa-premium-trend-v1';
  let gpaTrend = [];
  let gpaChart = null;
  let gpaDistributionChart = null;

  function showToast(msg, type = 'info') {
    const $toast = $('<div class="toast"></div>').text(msg);
    $('#toast-container').append($toast);
    setTimeout(() => $toast.fadeOut(400, () => $toast.remove()), 3000);
  }

  function saveToStorage() {
    const entries = $('.class-entry').map(function() {
      return {
        name: $(this).find('.class-input').val().trim(),
        grade: $(this).find('.class-select').val(),
        ap: $(this).find('.ap-check').prop('checked'),
        semester: $(this).find('.semester-check').prop('checked')
      };
    }).get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        const entries = JSON.parse(data);
        $('#class-list').empty();
        entries.forEach(e => addClass(e));
      } catch {}
    }
    updateEmptyState();
  }

  function validateEntry(name, grade, skipIndex = -1) {
    if (!name) return 'Class name is required.';
    if (!grade) return 'Grade is required.';
    // Check for duplicate names
    const names = $('.class-input').map(function(i) {
      return i !== skipIndex ? $(this).val().trim().toLowerCase() : null;
    }).get();
    if (names.filter(n => n === name.trim().toLowerCase()).length > 0) return 'Class name must be unique.';
    return '';
  }

  function createClassEntry(data = {}) {
    const $wrapper = $('<div class="class-entry"></div>');
    $wrapper.html(`
      <div class="class-row-content">
        <input placeholder="Class Name" class="class-input" value="${data.name || ''}" />
        <select class="class-select">
          ${Object.keys(gradeMap).map(g => `<option value="${g}"${data.grade === g ? ' selected' : ''}>${g}</option>`).join('')}
        </select>
        <label title="Advanced Placement (adds 0.25 to GPA)"><input type="checkbox" class="ap-check" ${data.ap ? 'checked' : ''}/> <span class="info-icon">AP</span></label>
        <label title="Semester class (0.5 credit)"><input type="checkbox" class="semester-check" ${data.semester ? 'checked' : ''}/> <span class="info-icon">Semester</span></label>
        <button type="button" class="class-delete-button btn-filled" title="Delete class">Delete</button>
      </div>
      <span class="error-msg"></span>
    `);
    // Validation on input
    const $nameInput = $wrapper.find('.class-input');
    const $gradeSelect = $wrapper.find('.class-select');
    const $errorMsg = $wrapper.find('.error-msg');
    function validateAndShow() {
      const err = validateEntry($nameInput.val(), $gradeSelect.val(), $wrapper.index());
      $errorMsg.text(err);
      return !err;
    }
    $nameInput.on('input', () => { validateAndShow(); saveToStorage(); calculateGPA(); });
    $gradeSelect.on('change', () => { validateAndShow(); saveToStorage(); calculateGPA(); });
    $wrapper.find('input[type=checkbox]').on('change', () => { saveToStorage(); calculateGPA(); });
    // Delete button
    $wrapper.find('.class-delete-button').on('click', function() {
      $wrapper.addClass('removing');
      setTimeout(() => {
        $wrapper.remove();
        saveToStorage();
        calculateGPA();
        showToast('Class deleted.','info');
        updateEmptyState();
      }, 250);
    });
    // Animation
    $wrapper.css('opacity', 0);
    setTimeout(() => { $wrapper.css('opacity', 1); }, 10);
    return $wrapper;
  }

  function addClass(data = {}) {
    const $entry = createClassEntry(data);
    $('#class-list').append($entry);
    setTimeout(() => $entry.css('opacity', 1), 10);
    updateEmptyState();
    saveToStorage();
    calculateGPA();
    showToast('Class added.','info');
  }

  function calculateGPA() {
    const $entries = $('.class-entry');
    let totalPoints = 0;
    let totalCredits = 0;
    let valid = true;
    $entries.each(function(idx) {
      const $entry = $(this);
      const name = $entry.find('.class-input').val().trim();
      const grade = $entry.find('.class-select').val();
      const isAP = $entry.find('.ap-check').prop('checked');
      const isSemester = $entry.find('.semester-check').prop('checked');
      const err = validateEntry(name, grade, idx);
      $entry.find('.error-msg').text(err);
      if (err) valid = false;
      let base = gradeMap[grade] || 0;
      if (isAP) base += 0.25;
      const credit = isSemester ? 0.5 : 1.0;
      totalPoints += base * credit;
      totalCredits += credit;
    });
    let gpa = 'N/A';
    if (valid && totalCredits) gpa = (totalPoints / totalCredits).toFixed(2);
    $('#gpa-output').text('GPA: ' + gpa);
    saveToStorage();
    // GPA trend logic
    if (valid && totalCredits) {
      if (gpaTrend.length === 0 || gpaTrend[gpaTrend.length-1].y !== parseFloat(gpa)) {
        addTrendPoint(gpa);
      }
    }
  }

  function updateEmptyState() {
    if ($('#class-list').children().length === 0) {
      $('#empty-state').show();
    } else {
      $('#empty-state').hide();
    }
    updateResetButtonVisibility();
  }

  function exportCSV() {
    const entries = $('.class-entry').map(function() {
      return {
        name: $(this).find('.class-input').val().trim(),
        grade: $(this).find('.class-select').val(),
        ap: $(this).find('.ap-check').prop('checked'),
        semester: $(this).find('.semester-check').prop('checked')
      };
    }).get();
    let csv = 'Class Name,Grade,AP,Semester\n';
    entries.forEach(e => {
      csv += `"${e.name}",${e.grade},${e.ap ? 'Yes' : 'No'},${e.semester ? 'Yes' : 'No'}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gpa-data.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported CSV.','info');
  }

  function saveTrend() {
    localStorage.setItem(TREND_KEY, JSON.stringify(gpaTrend));
  }
  function loadTrend() {
    const data = localStorage.getItem(TREND_KEY);
    if (data) {
      try { gpaTrend = JSON.parse(data); } catch { gpaTrend = []; }
    }
  }
  function addTrendPoint(gpa) {
    if (!isNaN(gpa) && gpa !== null && gpa !== undefined) {
      gpaTrend.push({
        x: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
        y: parseFloat(gpa)
      });
      if (gpaTrend.length > 20) gpaTrend.shift(); // keep last 20
      saveTrend();
      renderTrendChart();
    }
  }
  function renderTrendChart() {
    const ctx = document.getElementById('gpaTrendChart').getContext('2d');
    if (gpaChart) gpaChart.destroy();
    gpaChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: gpaTrend.map(p => p.x),
        datasets: [{
          label: 'GPA',
          data: gpaTrend.map(p => p.y),
          borderColor: '#B11E27',
          backgroundColor: 'rgba(177,30,39,0.08)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#B11E27',
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 4.5, ticks: { stepSize: 0.5 } }
        }
      }
    });
    renderDistributionChart();
  }
  function renderDistributionChart() {
    const ctx = document.getElementById('gpaDistributionChart').getContext('2d');
    if (gpaDistributionChart) gpaDistributionChart.destroy();
    // Count occurrences of each GPA value (rounded to 2 decimals)
    const counts = {};
    gpaTrend.forEach(p => {
      const g = p.y.toFixed(2);
      counts[g] = (counts[g] || 0) + 1;
    });
    const labels = Object.keys(counts).sort((a, b) => parseFloat(b) - parseFloat(a));
    const data = labels.map(l => counts[l]);
    gpaDistributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Count',
          data,
          backgroundColor: '#B11E27',
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, stepSize: 1 }
        }
      }
    });
  }
  function resetTrend() {
    gpaTrend = [];
    saveTrend();
    renderTrendChart();
    renderDistributionChart();
    showToast('GPA trend reset.','info');
  }

  function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      $('body').addClass('dark');
      $('#theme-toggle').prop('checked', true);
    } else {
      $('body').removeClass('dark');
      $('#theme-toggle').prop('checked', false);
    }
  }

  function resetAllData() {
    if (confirm("Are you sure you want to reset all your GPA data? This action cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TREND_KEY);
      gpaTrend = [];
      $('#class-list').empty();
      calculateGPA();
      renderTrendChart();
      showToast('All data has been reset.','info');
      updateEmptyState();
    }
  }

  function updateResetButtonVisibility() {
    const dataExists = localStorage.getItem(STORAGE_KEY) && JSON.parse(localStorage.getItem(STORAGE_KEY)).length > 0;
    if (dataExists) {
      $('#reset-data-btn').show();
    } else {
      $('#reset-data-btn').hide();
    }
  }

  // Event Listeners
  $('#add-class-btn').on('click', function() {
    console.log('Add Class button clicked!');
    addClass();
  });

  $('#csvBtn').on('click', exportCSV);
  $('#resetTrendBtn').on('click', function() {
    gpaTrend = [];
    saveTrend();
    renderTrendChart();
    showToast('GPA trend reset.','info');
  });
  $('#theme-toggle').on('change', toggleTheme);
  $('#closeHelpModal').on('click', function() {
    $('#help-modal').hide();
  });
  $('#help-button').on('click', function() {
    $('#help-modal').show();
  });
  $('#reset-data-btn').on('click', resetAllData);

  // Initial Load
  loadFromStorage();
  loadTrend();
  renderTrendChart();
  loadTheme();
  updateResetButtonVisibility(); // Call on initial load

  // Initial check for data from index.html
  const initialClassData = JSON.parse(localStorage.getItem('initialClassData') || '[]');
  if (initialClassData.length > 0) {
    initialClassData.forEach(c => addClass(c));
    localStorage.removeItem('initialClassData'); // Clear after use
  }

  // Move all functions inside the $(function() { ... }); block
  function toggleTheme() {
    $('body').toggleClass('dark');
    localStorage.setItem('gpa-theme', $('body').hasClass('dark') ? 'dark' : 'light');
  }

  function exportData() {
    const entries = $('.class-entry').map(function() {
      return {
        name: $(this).find('.class-input').val().trim(),
        grade: $(this).find('.class-select').val(),
        ap: $(this).find('.ap-check').prop('checked'),
        semester: $(this).find('.semester-check').prop('checked')
      };
    }).get();
    const blob = new Blob([JSON.stringify(entries, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gpa-data.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported GPA data.','info');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          $('#class-list').empty();
          data.forEach(e => addClass(e));
          showToast('Imported GPA data.','info');
        } else {
          showToast('Invalid file format.','error');
        }
      } catch {
        showToast('Invalid file format.','error');
      }
      updateEmptyState();
      saveToStorage();
      calculateGPA();
    };
    reader.readAsText(file);
  }

  function printPage() {
    window.print();
    showToast('Print dialog opened.','info');
  }
});
