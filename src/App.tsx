import React, { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

function App() {
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
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

  const handleAutofill = () => {
    Object.entries(autofillValues).forEach(([fieldName, value]) => {
      const inputElement = inputRefs.current[fieldName];
      if (inputElement) {
        if (inputElement.type === "checkbox") {
          inputElement.checked = value;
        } else {
          inputElement.value = value;
        }

        // Log the autofill action
        console.log(`Autofilled ${fieldName} with value: ${value}`);
      } else {
        console.warn(`No input found for ${fieldName}`);
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
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }

          const loadingTask = window.pdfjsLib.getDocument({ data: pdf });
          loadingTask.promise.then((pdfDocument) => {
            pdfDocument.getPage(1).then((page) => {
              const viewport = page.getViewport({ scale: scale });
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              if (containerRef.current) {
                containerRef.current.appendChild(canvas);
              }

              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              page.render(renderContext).promise.then(() => {
                return page.getAnnotations();
              }).then((annotations) => {
                annotations.forEach((annotation) => {
                  if (
                    annotation.fieldType === "Btn" &&
                    annotation.checkBox !== true
                  ) {
                    // This is a radio button. Log its group name and value.
                    // console.log(
                    //   `Radio Button Found: Group Name: ${annotation.fieldName}, Option Value: ${annotation.buttonValue}`,
                    // );
                      console.log('radio anno', annotation)
                  } else {
                    // Log other field types
                    // console.log(
                    //   `Field Found: Name: ${annotation.fieldName}, Type: ${annotation.fieldType}, Subtype: ${annotation.subtype}`,
                    // );
                  }
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
                  }
                });
              });
            });
          });
        }
      }
    }, 100);

    return () => clearInterval(waitForPdfjs);
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

  const updatePdf = async () => {
    if (pdf) {
      const existingPdf = await PDFDocument.load(pdf);
      const form = existingPdf.getForm();
      const updatedGroups = {}; // To track which radio groups have been updated

      Object.entries(inputRefs.current).forEach(([key, input]) => {
        const field = form.getField(key);
        if (field) {
          console.log(
            `Updating field: ${key}, Type: ${field.constructor.name}, Value: ${input.value}, Checked: ${input.checked}`,
          );

          if (field.constructor.name.includes("PDFTextField")) {
            field.setText(input.value);
            console.log(`Text field ${key} set to ${input.value}`);
          } else if (field.constructor.name.includes("PDFCheckBox")) {
            if (input.checked) {
              field.check();
            } else {
              field.uncheck();
            }
            console.log(`Checkbox ${key} set to ${input.checked}`);
          } else if (field.constructor.name.match(/PDFRadioGroup/)) {
            console.log(
              `Radio Group: ${field.getName()}, Option: ${input.value}, Checked: ${input.checked}`,
            );
            // Update the radio button only if it's the one that's checked and the group hasn't been updated yet
            if (input.checked && !updatedGroups[field.getName()]) {
              console.log(
                `Setting radio group ${field.getName()} to value ${input.value}`,
              );
              form.getRadioGroup(field.getName()).select(input.value);
              updatedGroups[field.getName()] = true; // Mark this group as updated
            }
          }
        } else {
          console.warn(`No PDF field found for name: ${key}`);
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
    </div>
  );
}

export default App;
