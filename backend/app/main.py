import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from . import config
from .db import Base, engine, get_db
from .models import Task

logging.basicConfig(level=config.LOG_LEVEL, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


def init_db(attempts: int = 15, delay: float = 2.0) -> None:
    # База може стартувати пізніше за бекенд (Kubernetes не гарантує порядок),
    # тому пробуємо кілька разів, перш ніж здатися
    for attempt in range(1, attempts + 1):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except (OperationalError, ProgrammingError) as e:
            log.warning("База недоступна (спроба %d/%d): %s", attempt, attempts, e.__class__.__name__)
            time.sleep(delay)
    raise RuntimeError("Не вдалося підключитися до бази даних")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Старт: версія=%s, середовище=%s, под=%s", config.APP_VERSION, config.APP_ENV, config.HOSTNAME)
    init_db()
    yield


app = FastAPI(title="Task List API", lifespan=lifespan)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class TaskUpdate(BaseModel):
    done: bool


class TaskOut(BaseModel):
    id: int
    title: str
    done: bool

    model_config = {"from_attributes": True}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/info")
def info():
    return {
        "version": config.APP_VERSION,
        "env": config.APP_ENV,
        "log_level": config.LOG_LEVEL,
        "pod": config.HOSTNAME,
    }


@app.get("/api/tasks", response_model=list[TaskOut])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).order_by(Task.id).all()


@app.post("/api/tasks", response_model=TaskOut, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(title=data.title, done=False)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.patch("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task.done = data.done
    db.commit()
    db.refresh(task)
    return task


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
