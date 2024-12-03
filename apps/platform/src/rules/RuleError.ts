export default {
    CompileError: (stack: string) => ({
        message: `A rule contains an invalid Handlebars template (${stack})`,
        code: 7000,
        statusCode: 422,
    }),
}
