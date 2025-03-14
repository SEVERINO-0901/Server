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
            secure: false,
        });

        // Garante que a pasta raiz exista no FTP
        try {
            // Não é necessário garantir a criação de pasta, pois queremos enviar para a raiz
        } catch (error) {
            console.error("Erro ao acessar o FTP:", error);
            return res.json({ success: false, error: "Erro ao acessar o FTP." });
        }

        let uploadedFiles = [];

        // Iterar sobre os arquivos e enviá-los para a raiz do FTP
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

            // Enviar o arquivo para a pasta raiz do FTP
            await clientFTP.uploadFrom(stream, `/${fileName}`);  // Envia para a raiz do FTP
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







