const sdk = require("node-appwrite");
const ftp = require("basic-ftp");
const axios = require("axios");

module.exports = async function ({ res }) {
    // Configura o Appwrite SDK
    const client = new sdk.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") // Substitua pelo seu endpoint Appwrite
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const storage = new sdk.Storage(client);

    try {
        // 🔍 Listar todos os arquivos no bucket
        const fileList = await storage.listFiles(process.env.APPWRITE_BUCKET_ID);

        if (fileList.total === 0) {
            return res.json({ success: false, message: "Nenhum arquivo encontrado no bucket." });
        }

        // 📡 Conectar ao servidor FTP
        const clientFTP = new ftp.Client();
        clientFTP.ftp.verbose = true;

        await clientFTP.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false, // Defina como true se o servidor exigir SSL/TLS
        });

        let uploadedFiles = [];

        // 🔄 Percorrer todos os arquivos do bucket
        for (const file of fileList.files) {
            const fileId = file.$id;
            const fileName = file.name;

            console.log(`Baixando ${fileName}...`);

            // 🔽 Baixar o arquivo
            const response = await axios.get(`https://cloud.appwrite.io/v1/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`, {
                headers: { "X-Appwrite-Key": process.env.APPWRITE_API_KEY },
                responseType: "arraybuffer",
            });

            console.log(`Enviando ${fileName} para o FTP...`);

            // 📤 Enviar o arquivo para o FTP
            await clientFTP.uploadFrom(Buffer.from(response.data), `${process.env.FTP_TARGET_FOLDER}/${fileName}`);
            uploadedFiles.push(fileName);
        }

        clientFTP.close();

        console.log("Todos os arquivos foram enviados com sucesso!");
        return res.json({ success: true, files: uploadedFiles });

    } catch (error) {
        console.error("Erro ao transferir arquivos:", error);
        return res.json({ success: false, error: error.message });
    }
};



