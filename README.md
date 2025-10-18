# Onebox
Assignment submission
1. Clone the repo
git clone https://github.com/https://github.com/athish-r/Onebox
cd filename

2. Install dependencies
npm install

3. Run Elasticsearch (via Docker)
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:8.15.0

4. Configure environment

Create a .env file in the project root:

ELASTIC_URL=http://localhost:9200

# IMAP credentials (example)
IMAP_USER1=example1@gmail.com
IMAP_PASS1=yourpassword
IMAP_HOST1=imap.gmail.com
IMAP_PORT1=993
IMAP_TLS1=true

5. Compile and run

For development:

npx ts-node src/server.ts


Or build and run:

npm run build
node dist/server.js
