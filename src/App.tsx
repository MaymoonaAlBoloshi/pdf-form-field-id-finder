import React, { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

function App() {
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
  const containerRef = useRef(null);
  const inputRefs = useRef({});
  const scale = 1.5;

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
                  if (annotation.fieldType === "Btn" && annotation.checkBox) {
                    console.log(
                      `Checkbox Name: ${annotation.fieldName}, Default Value: ${annotation.fieldValue}`,
                    );
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
                        // Adjust the checked state based on the PDF's filled value
                        // You might need to add more conditions based on your specific PDFs
                        input.checked = !(annotation.fieldValue === "Off" ||
                          annotation.fieldValue === "0");
                      } else {
                        input = document.createElement("input");
                        input.type = "radio";
                        input.name = annotation.fieldName;
                        input.value = annotation.buttonValue;
                        // Set checked based on whether the current button's value matches the filled value
                        // Adjust as necessary for your specific PDFs
                        input.checked =
                          annotation.fieldValue === annotation.buttonValue;
                      }
                    }
                  }

                  if (input) {
                    // Set input styles and append to the container...
                    console.log(
                      `Created input for field: ${annotation.fieldName}, Type: ${input.type}, Initial Value/Checked State: ${
                        input.type === "checkbox" ? input.checked : input.value
                      }`,
                    );
                    containerRef.current.appendChild(input);
                    inputRefs.current[annotation.fieldName] = input;
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

      Object.entries(inputRefs.current).forEach(([key, input]) => {
        const field = form.getField(key);
        if (field) {
          // Check the field type using a more flexible approach
          const fieldType = field.constructor.name;
          if (fieldType.includes("PDFTextField")) {
            field.setText(input.value);
          } else if (fieldType.includes("PDFCheckBox")) {
            if (input.checked) {
              field.check();
            } else {
              field.uncheck();
            }
          } else if (fieldType.includes("PDFRadioButton")) {
            if (input.checked) {
              form.getRadioGroup(field.getName()).select(input.value);
            }
          }
        } else {
          console.warn(`No PDF field found for name: ${key}`);
        }
      });

      const pdfBytes = await existingPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "updated-document.pdf";
      console.log("Triggering download for the updated PDF.");
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
    </div>
  );
}

export default App;
