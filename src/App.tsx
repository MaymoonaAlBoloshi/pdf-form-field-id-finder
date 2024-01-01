import React, { useEffect, useRef, useState } from "react";
import { PDFDocument, PDFHexString } from "pdf-lib";

function App() {
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const containerRef = useRef(null);
  const inputRefs = useRef({});
  const scale = 1.5;

  const autofillValues = {
    // SSN Fields
    "F[0].Page_1[0].PatientSection[0].SSN[0]": "123-45-6789", // Dummy SSN
    "F[0].Page_1[0].PatientSection[0].SSN[1]": "987-65-4321", // Another Dummy SSN

    // Name of Veteran
    "F[0].Page_1[0].PatientSection[0].NameOfVeteran[0]": "John Doe", // Dummy Name

    // Other Text Fields
    "F[0].#subform[1].TextField10[0]": "Sample Text for TextField10", // Dummy Text
    "F[0].#subform[1].HowExamCOnducted[0]": "In person", // Dummy Exam Conduct Method
    "F[0].#subform[1].IdentifyEvidence[0]": "Document A, Document B", // Dummy Evidence List

    // Checkboxes with Dummy States (true for checked, false for unchecked)
    "F[0].#subform[1].VeteranClaimant[0]": true, // Checked
    "F[0].#subform[1].OtherDescribe[0]": false, // Unchecked

    // Radio Button Groups with Selected Option
    "F[0].#subform[1].RadioButtonList[0]": "1", // Selecting option value "1" for the first group
    "F[0].#subform[1].RadioButtonList[1]": "0", // Selecting option value "0" for the second group
    "F[0].#subform[1].RadioButtonList[2]": "1", // Selecting option value "1" for the third group
    "F[0].#subform[1].RadioButtonList[3]": "0", // Selecting option value "0" for the fourth group
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  console.log(inputRefs.current)
  
  const handleAutofill = () => {
    Object.entries(autofillValues).forEach(([fieldName, value]) => {
      const inputElement = inputRefs.current[fieldName];
      if (!inputElement) console.warn(`No input found for ${fieldName}`);
      if (inputElement.type === "checkbox") {
        inputElement.checked = value;
      } else {
        inputElement.value = value;
      }
    });

    Object.entries(autofillValues).forEach(([fieldName, value]) => {
      const inputElement = inputRefs.current[fieldName];
      if (!inputElement) console.warn(`No input found for ${fieldName}`);

      if (inputElement.type === "radio") {
        if (inputElement.value === value.toString()) {
          inputElement.checked = true;
        }
      }
    });
  };

  const loadScript = (src, id) => {
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.src = src;
      script.id = id;
      document.body.appendChild(script);
    }
  };

  useEffect(() => {
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js",
      "pdfjs",
    );
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js",
      "pdfjs-worker",
    );

    const waitForPdfjs = setInterval(() => {
      if (window.pdfjsLib) {
        clearInterval(waitForPdfjs);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";

        if (pdf) {
          const loadingTask = window.pdfjsLib.getDocument({ data: pdf });
          loadingTask.promise.then((pdfDocument) => {
            setTotalPages(pdfDocument.numPages); // Set the total number of pages

            pdfDocument.getPage(currentPage).then((page) => {
              // Clear previous inputs and canvas
              if (containerRef.current) {
                containerRef.current.innerHTML = "";
                inputRefs.current = {}; // Clear previous input references
              }

              const viewport = page.getViewport({ scale: scale });
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              containerRef.current.appendChild(canvas);

              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              page.render(renderContext).promise.then(() => {
                return page.getAnnotations();
              }).then((annotations) => {
                annotations.forEach((annotation) => {
                  let input;

                  if (annotation.subtype === "Widget") {
                    if (annotation.fieldType === "Tx") {
                      input = document.createElement("input");
                      input.type = "text";
                      input.value = annotation.fieldValue || "";
                    } else if (annotation.fieldType === "Btn") {
                      if (annotation.checkBox) {
                        input = document.createElement("input");
                        input.type = "checkbox";
                        input.checked = !(annotation.fieldValue === "Off" ||
                          annotation.fieldValue === "0");
                      } else {
                        input = document.createElement("input");
                        input.type = "radio";
                        input.name = annotation.fieldName;
                        input.value = annotation.buttonValue;
                        input.checked =
                          annotation.fieldValue === annotation.buttonValue;
                      }
                    }
                  }
                  if (input) {
                    input.style.position = "absolute";
                    input.style.left = (annotation.rect[0] * scale + 3) + "px";
                    input.style.top =
                      (canvas.height - annotation.rect[3] * scale + 5) + "px";
                    input.style.width =
                      (annotation.rect[2] - annotation.rect[0]) * scale + "px";
                    input.style.height =
                      (annotation.rect[3] - annotation.rect[1]) * scale + "px";
                    containerRef.current.appendChild(input);
                    inputRefs.current[annotation.fieldName] = input;

                    // Register event listeners for changes
                    const logChange = (event) => {
                      // console.log(
                      //   `Field changed: ${annotation.fieldName}, New Value: ${event.target.value}, Checked: ${event.target.checked}`,
                      // );
                    };
                    if (input.type === "text") {
                      input.addEventListener("input", logChange);
                    } else if (
                      input.type === "checkbox" || input.type === "radio"
                    ) {
                      input.addEventListener("change", logChange);
                    }
                  }
                });
              });
            });
          });
        }
      }
    }, 100);

    return () => clearInterval(waitForPdfjs);
  }, [pdf, currentPage]); // Depend on pdf and currentPage

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

  const updatePdf = async () => {
    if (pdf) {
      const existingPdf = await PDFDocument.load(pdf);
      const form = existingPdf.getForm();
      const updatedGroups = {}; // To track which radio groups have been updated

      Object.entries(inputRefs.current).forEach(([key, input]) => {
        const field = form.getField(key);

        if (field) {
          if (field.constructor.name.includes("PDFTextField")) {
            field.setText(input.value);
          } else if (field.constructor.name.includes("PDFCheckBox")) {
            if (input.checked) {
              field.check();
            } else {
              field.uncheck();
            }
          } else if (field.constructor.name.match(/PDFRadioGroup/)) {
            const options = field.getOptions(); // Get available options as an array

            // Find the checked radio button in this group using the key (field name)
            const checkedInput = document.querySelector(
              `input[name="${key}"]:checked`,
            );

            if (checkedInput && !updatedGroups[field.getName()]) {
              // Ensure the value of the checked radio button is one of the available options
              if (options.includes(checkedInput.value)) {
                const optionValue = parseInt(checkedInput.value) + 1;
                field.select(optionValue.toString()); // Select the option in the radio group
                updatedGroups[field.getName()] = true; // Mark this group as updated
              } else {
                console.warn(
                  `Invalid value for ${field.getName()}: ${checkedInput.value}`,
                );
              }
            }
          }
        } else {
          console.warn(`No field found in PDF for ${key}`);
        }
      });

      // Save the updated PDF and provide it for download
      const pdfBytes = await existingPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "updated-document.pdf";
      link.click();
    } else {
      console.warn("No PDF loaded when attempting to save updates.");
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", backgroundColor: "pink" }}>
      <div ref={containerRef} />
      <input type="file" onChange={handleFileChange} accept="application/pdf" />
      <button onClick={updatePdf}>Save Changes</button>

      <button onClick={handleAutofill}>Autofill</button> {/* Autofill Button */}

      <button onClick={goToPreviousPage} disabled={currentPage === 1}>
        Previous Page
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button onClick={goToNextPage} disabled={currentPage === totalPages}>
        Next Page
      </button>
    </div>
  );
}

export default App;
