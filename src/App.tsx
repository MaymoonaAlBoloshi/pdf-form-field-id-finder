// Dear future develoepr, sorry if this kills your brain cells.
// I wrote this by making a deal with Satan (CHatGPT), which was to  get the funcitonality done
// but I'll never be able to read it.
// I hope you live in peace
import React, { useEffect, useRef, useState } from "react";
import { PDFDocument, PDFHexString } from "pdf-lib";
import "./App.css";

function App() {
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [schema, setSchema] = useState([]);

  const containerRef = useRef(null);
  const inputRefs = useRef({});
  const scale = 1.5;

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
                  const getFieldType = (annotation) => {
                    if (annotation.fieldType === "Tx") {
                      return "text";
                    } else if (annotation.fieldType === "Btn") {
                      if (annotation.checkBox) {
                        return "checkbox";
                      } else {
                        return "radio";
                      }
                    }
                  };

                  let fieldObj = {
                    id: annotation.id,
                    name: annotation.fieldName,
                    value: annotation.fieldValue,
                    type: getFieldType(annotation),
                  };

                  setSchema((prevSchema) => {
                    return [...prevSchema, fieldObj];
                  });

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
                    input.style.left = ((annotation.rect[0] * scale) + -5 +
                      containerRef.current.offsetLeft) + "px";
                    input.style.top =
                      ((canvas.height - annotation.rect[3] * scale) + -3 +
                        containerRef.current.offsetTop) + "px";
                    input.style.width =
                      ((annotation.rect[2] - annotation.rect[0]) * scale) +
                      "px";
                    input.style.height =
                      ((annotation.rect[3] - annotation.rect[1]) * scale) +
                      "px";
                    input.title = annotation.id; // Set the title attribute to the ID
                    containerRef.current.appendChild(input);
                    inputRefs.current[annotation.fieldName] = input;

                    const logChange = (event) => {
                      console.log("Changed input", event.target.value);
                      return;
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

  return (
    <>
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 100,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#1d8085",
          }}
        >
          <input
            type="file"
            onChange={handleFileChange}
            accept="application/pdf"
            className="outlined-button"
            style={{
              position: "relative",
            }}
          />
        </div>
        <div ref={containerRef} />

        <div
          style={{
            width: "100%",
            height: 100,
            display: "flex",
            justifyContent: "center",
            padding: 20,
            gap: 20,
            alignItems: "center",
          }}
        >
          <button
            className="direction-button"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            className="direction-button"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>

        <button
          className="direction-button"
          onClick={() =>
            document.getElementById("schema-output").value = JSON.stringify(
              schema,
              null,
              2,
            )}
        >
          Log Schema
        </button>
        <textarea
          id="schema-output"
          style={{
            minHeight: "500px",
          }}
          rows={10}
          cols={80}
        >
        </textarea>
      </div>
    </>
  );
}

export default App;
