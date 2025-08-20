$(function() {
  $('.calculate-btn').on('click', function(e) {
    e.preventDefault();

    const className = $('.homepage-class-name').val();
    const classGrade = $('.homepage-class-grade').val();
    const isAP = $('.homepage-ap-check').prop('checked');
    const isSemester = $('.homepage-semester-check').prop('checked');

    // Only save if class name is not empty (basic validation)
    if (className.trim() !== '') {
      const initialClassData = [{
        name: className.trim(),
        grade: classGrade,
        ap: isAP,
        semester: isSemester
      }];
      localStorage.setItem('initialClassData', JSON.stringify(initialClassData));
    }

    window.location.href = 'calculator.html';
  });
}); 