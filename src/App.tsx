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
                        input.checked = annotation.fieldValue === "Yes";
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

      Object.entries(inputRefs.current).forEach(([name, input]) => {
        const field = form.getField(name);
        if (field) {
          if (field.constructor.name === "PDFTextField") {
            field.setText(input.value);
          } else if (field.constructor.name === "PDFCheckBox") {
            if (input.checked) {
              field.check();
            } else {
              field.uncheck();
            }
          } else if (field.constructor.name === "PDFRadioButton") {
            if (input.checked) {
              form.getRadioGroup(field.getName()).select(input.value);
            }
          }
        }
      });

      const pdfBytes = await existingPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "updated-document.pdf";
      link.click();
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
