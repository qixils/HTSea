# syntax=docker/dockerfile:1

FROM python:3.10-slim-bullseye
WORKDIR /app
COPY app .
COPY vendor .
RUN apt-get update
RUN apt-get install -y netcat
RUN pip3 install -r requirements.txt

# Wait for postgres to initialize
CMD [ "sh", "-c", "./wait-for db:5432 -- uvicorn main:app --reload --host 0.0.0.0" ]