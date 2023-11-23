import { Sequelize } from "sequelize";
import mysql from "mysql2/promise";

const initializeSequelize = async () => {
    try {
        const connection = await mysql.createConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME};`);

        const sequelize = new Sequelize(
            process.env.DB_NAME,
            process.env.DB_USER,
            process.env.DB_PASSWORD,
            {
                dialect: "mysql",
                host: process.env.DB_HOST,
                define: {
                    collate: "utf8mb4_bin",
                },
            }
        );

        return sequelize;
    } catch (error) {
        console.error("Error initializing Sequelize:", error);
        throw error;
    }
};

const sequelize = await initializeSequelize();

export default sequelize;
