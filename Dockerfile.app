# syntax=docker/dockerfile:1

FROM python:3.10-slim-bullseye
WORKDIR /app
RUN apt-get update
RUN apt-get install -y netcat
# Copy requirements before copying the rest of the app so Docker can cache them
COPY app/requirements.txt .
COPY vendor .
RUN pip3 install -r requirements.txt
COPY app .

# Wait for postgres to initialize
CMD [ "sh", "-c", "./wait-for db:5432 -- uvicorn main:app --reload --host 0.0.0.0" ]