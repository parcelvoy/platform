export default {
    UndefinedStorageMethod: {
        message: 'A valid storage method must be defined!',
        code: 5000,
    },
    NoFilesUploaded: {
        message: 'The request contains no files. Please attach a file to upload.',
        code: 5001,
    },
    BadFormType: {
        message: 'Incorrect form type. Please make sure file is being submitted in a multipart form.',
        code: 5002,
    },
}
