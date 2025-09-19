# Lesson Plan Creator

A web-based tool for creating structured lesson plans with automatic time calculations, learning objectives management, and export capabilities.

## Demo

[Live Demo](https://lessplan.tinfo.space)

## Features

- **Interactive Lesson Planning**: Create detailed lesson plans with multiple phases
- **Automatic Time Calculation**: Set start time and duration per phase for automatic time range generation
- **Learning Objectives Management**: Add and manage multiple learning objectives
- **Phase Management**: 
  - Add, remove, and reorder lesson phases
  - Configure social forms (individual work, group work, plenum, etc.)
  - Add implementation details and materials
- **Export Options**:
  - PDF export with formatted tables
  - JSON export for backup and sharing
  - JSON import to restore saved lesson plans
- **Dark Theme**: Modern dark interface with blue accent colors
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **PDF Generation**: jsPDF with autoTable plugin
- **Styling**: CSS Custom Properties (CSS Variables)
- **Icons**: Unicode characters

## Getting Started

### Prerequisites

- Modern web browser with JavaScript enabled
- No server installation required

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HansTydecks/fast-lessonplan.git
```

2. Open `index.html` in your web browser, or serve the files using a local web server.

### Usage

1. **Basic Setup**: Enter lesson title and start time
2. **Learning Objectives**: Add learning objectives (automatically creates new input fields)
3. **Lesson Phases**: 
   - Click "Neue Phase" to add lesson phases
   - Set duration, social form, and task details
   - Use arrow buttons to reorder phases
4. **Export**: 
   - Generate PDF for printing or digital distribution
   - Save as JSON for backup or sharing with colleagues
   - Import JSON files to restore previous lesson plans

## File Structure

```
├── index.html          # Main HTML structure
├── script.js           # JavaScript functionality
├── styles.css          # CSS styling with dark theme
├── CNAME              # GitHub Pages domain configuration
└── README.md          # This file
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is open source and available under the MIT License.

## Author

**Hans Tydecks**
- GitHub: [@HansTydecks](https://github.com/HansTydecks)
- More Tools: [Digital Tools Collection](https://tinfo.space/teachers/Digitale_Tools/)
- Contact: [contact.tinfo.space](http://contact.tinfo.space/)

## Acknowledgments

- Built for educators and learners
- Uses jsPDF library for PDF generation
- Responsive design principles for cross-device compatibility