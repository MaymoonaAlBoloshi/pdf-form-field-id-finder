 export const autofillValues = {
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
