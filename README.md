# 🐇 Rabbitt AI --- Sales Insight Automator

AI-powered tool that analyzes sales data and generates executive
summaries using AI, then sends the report via email.

The system allows users to upload **CSV or Excel sales files**,
automatically analyzes the data using an AI model, and sends a
professional **sales insight report** to the provided email address.

------------------------------------------------------------------------

# 🚀 Getting Started

Follow the steps below to run the application locally.

------------------------------------------------------------------------

# 1️⃣ Clone the Repository

git clone https://github.com/your-username/sales-insight-automator.git\
cd sales-insight-automator

------------------------------------------------------------------------

# 2️⃣ Configure Environment Variables

Create a `.env` file in the **root folder**.

You can copy the example file:

cp .env.example .env

Then edit the `.env` file and add your credentials.

Example:

# AI Configuration

GEMINI_API_KEY=your_gemini_api_key GEMINI_MODEL=gemini-2.5-flash

# Email Configuration

SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587 SMTP_SECURE=false
SMTP_USER=apikey SMTP_PASS=your_brevo_api_key

EMAIL_FROM_NAME=Rabbitt AI Sales Insights
EMAIL_FROM_ADDRESS=your_email@gmail.com

# File Upload Limit

MAX_FILE_SIZE_MB=10

------------------------------------------------------------------------

# 3️⃣ Start the Application

From the **root directory**, run the following command:

docker compose up --build

Docker will automatically:

-   Build the backend container
-   Build the frontend container
-   Start both services

------------------------------------------------------------------------

# 🌐 Application URLs

Once the containers start successfully, open:

Frontend → http://localhost:3000\
Backend API → http://localhost:5000\
Swagger API Docs → http://localhost:5000/api/docs

------------------------------------------------------------------------

# 📊 How the Application Works

1.  Upload a **CSV or Excel sales dataset**
2.  Enter the **recipient email address**
3.  Submit the request
4.  The system will:

-   Parse the uploaded data
-   Compute statistics
-   Generate an AI-powered sales summary
-   Send the summary via email

------------------------------------------------------------------------

# 📂 Supported File Formats

.csv\
.xlsx\
.xls

Maximum upload size is controlled by:

MAX_FILE_SIZE_MB

(Default: 10MB)

------------------------------------------------------------------------

# 🛑 Stop the Application

To stop the running containers press:

CTRL + C

Or run:

docker compose down

------------------------------------------------------------------------

# 🧰 Requirements

Make sure you have the following installed:

-   Docker
-   Docker Compose
-   Git

------------------------------------------------------------------------

# 📁 Project Structure

sales-insight-automator\
│\
├── backend\
│ ├── src\
│ │ ├── routes\
│ │ ├── services\
│ │ ├── middleware\
│ │ └── config\
│ └── package.json\
│\
├── frontend\
│ ├── src\
│ └── package.json\
│\
├── docker-compose.yml\
├── .env.example\
└── README.md

------------------------------------------------------------------------

# ⚡ One Command Startup

After configuring `.env`, the entire application can be started using:

docker compose up --build

------------------------------------------------------------------------

Built for **Rabbitt AI Engineering Sprint**.
