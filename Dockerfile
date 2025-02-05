FROM python:3.9-slim

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Poetry 설치
ENV POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_VERSION=1.5.1
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="$POETRY_HOME/bin:$PATH"

WORKDIR /app

# 필요한 디렉토리 생성
RUN mkdir -p templates static

# Poetry 파일 복사 및 의존성 설치
COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-dev --no-interaction --no-ansi

# 애플리케이션 파일 복사
COPY templates/ templates/
COPY static/ static/
COPY app.py .

EXPOSE 8282

CMD ["poetry", "run", "python", "app.py"] 