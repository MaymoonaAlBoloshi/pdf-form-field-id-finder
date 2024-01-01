import { PDFDocument } from "pdf-lib";

export const updatePdf = async (pdf, inputRefs) => {
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
          console.log(`Checkbox ${key} set to ${input.checked}`);
        } else if (field.constructor.name.match(/PDFRadioGroup/)) {
          const options = field.getOptions(); // Get available options as an array
          console.log(
            `Found Radio Group: ${field.getName()}, Available Options: ${
              options.join(",")
            }`,
          );

          // Find the checked radio button in this group using the key (field name)
          const checkedInput = document.querySelector(
            `input[name="${key}"]:checked`,
          );

          if (checkedInput && !updatedGroups[field.getName()]) {
            console.log(
              `Checked radio button for ${field.getName()} has value ${checkedInput.value}`,
            );

            // Ensure the value of the checked radio button is one of the available options
            if (options.includes(checkedInput.value)) {
              console.log(
                `Setting radio group ${field.getName()} to value ${checkedInput.value}`,
              );
              const optionValue = parseInt(checkedInput.value) + 1;
              console.log(`Option value: ${optionValue}`);
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
