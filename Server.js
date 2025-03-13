import { Client, Storage } from "node-appwrite";
import ftp from "basic-ftp";
import axios from "axios";
import streamifier from "streamifier";  // Importar streamifier

export default async function ({ res }) {
    const client = new Client()
        .setEndpoint("https://cloud.appwrite.io/v1")
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const storage = new Storage(client);

    try {
        // Listar todos os arquivos no bucket
        const fileList = await storage.listFiles(process.env.APPWRITE_BUCKET_ID);
        if (fileList.total === 0) {
            return res.json({ success: false, message: "Nenhum arquivo encontrado no bucket." });
        }

        const clientFTP = new ftp.Client();
        clientFTP.ftp.verbose = true;

        await clientFTP.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: true,
        });

        // Garantir que a pasta exista (criar a pasta caso não exista)
        const targetDir = process.env.FTP_TARGET_FOLDER;
        try {
            // Tenta garantir que a pasta existe
            await clientFTP.ensureDir(targetDir);
            console.log(`A pasta ${targetDir} existe ou foi criada.`);
        } catch (error) {
            console.error("Erro ao acessar o FTP:", error);
            return res.json({ success: false, error: "Erro ao acessar o FTP." });
        }

        let uploadedFiles = [];

        // Iterar sobre os arquivos e enviá-los para a pasta especificada
        for (const file of fileList.files) {
            const fileId = file.$id;
            const fileName = file.name;

            console.log(`Baixando ${fileName}...`);

            // Obter o arquivo do Appwrite com o GET
            const response = await axios.get(
                `https://cloud.appwrite.io/v1/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`,
                {
                    headers: { "X-Appwrite-Key": process.env.APPWRITE_API_KEY },
                    responseType: "arraybuffer",
                }
            );

            console.log(`Enviando ${fileName} para o FTP...`);

            // Converter o Buffer para stream
            const stream = streamifier.createReadStream(response.data);

            // Enviar o arquivo para a pasta no FTP
            await clientFTP.uploadFrom(stream, `${targetDir}${fileName}`);
            uploadedFiles.push(fileName);
        }

        clientFTP.close();
        console.log("Todos os arquivos foram enviados com sucesso!");
        return res.json({ success: true, files: uploadedFiles });

    } catch (error) {
        console.error("Erro ao transferir arquivos:", error);
        return res.json({ success: false, error: error.message });
    }
}







