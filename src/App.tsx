import { useEffect, useState } from "react";
import { PDFDocument, PDFTextField } from "pdf-lib";

function App() {
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
  const [fields, setFields] = useState<
    { name: string; value: string; type: string }[]
  >([]);

  useEffect(() => {
    const loadPdf = async () => {
      if (!pdf) return;

      try {
        const pdfDoc = await PDFDocument.load(pdf);
        const form = pdfDoc.getForm();
        const pdfFields = form.getFields();
        const fieldData = pdfFields.map((field) => ({
          name: field.getName(),
          value: field instanceof PDFTextField ? field.getText() : "",
          type: field.constructor.name,
        }));
        setFields(fieldData);
      } catch (error) {
        console.log(error);
      }
    };

    loadPdf();
  }, [pdf]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      setPdf(arrayBuffer as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInputChange = (name: string, value: string) => {
    setFields(
      fields.map((field) => field.name === name ? { ...field, value } : field),
    );
  };

  const renderInputField = (field) => {
    switch (field.type) {
      case "PDFTextField2":
        return (
          <input
            type="text"
            value={field.value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          />
        );
      case "PDFCheckBox2":
        return (
          <input
            type="checkbox"
            checked={field.value === "Yes"} // Assuming 'Yes' means checked
            onChange={(e) =>
              handleInputChange(field.name, e.target.checked ? "Yes" : "No")}
          />
        );
      case "PDFRadioGroup2":
        // For radio buttons, you need to define the options
        const options = ["Option1", "Option2", "Option3"]; // Define your options
        return (
          <div>
            {options.map((option, idx) => (
              <label key={idx}>
                <input
                  type="radio"
                  value={option}
                  checked={field.value === option}
                  onChange={(e) => handleInputChange(field.name, option)}
                />
                {option}
              </label>
            ))}
          </div>
        );
      default:
        return <div>Unsupported field type</div>;
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", backgroundColor: "pink" }}>
      <input type="file" onChange={handleFileChange} />
      {fields.map((field, index) => (
        <div key={index}>
          <label>{field.name}</label>
          {renderInputField(field)}
        </div>
      ))}
    </div>
  );
}

export default App;
