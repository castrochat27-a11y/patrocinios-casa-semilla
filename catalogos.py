# Catálogos del Control de Patrocinios y Donaciones

# El estado determina en cuál pantalla aparece cada registro.
ESTADOS = [
    "Pendiente de contactar",
    "En espera de respuesta",
    "En negociación",
    "Aceptada",
    "Donación realizada",
    "Negada",
]

ESTADOS_DESC = {
    "Pendiente de contactar": "Todavía no se ha hecho el primer contacto con la empresa.",
    "En espera de respuesta": "Ya se envió la propuesta y se espera que respondan.",
    "En negociación": "La empresa mostró interés y se está definiendo el aporte.",
    "Aceptada": "La empresa confirmó el patrocinio, pero el aporte aún no se recibe.",
    "Donación realizada": "El aporte ya fue entregado y recibido.",
    "Negada": "La empresa indicó que no desea participar.",
}

# Clase de color usada en la interfaz para cada estado.
ESTADOS_CLASE = {
    "Pendiente de contactar": "e-pendiente",
    "En espera de respuesta": "e-espera",
    "En negociación": "e-negociacion",
    "Aceptada": "e-aceptada",
    "Donación realizada": "e-realizada",
    "Negada": "e-negada",
}

# Estados que se consideran gestiones aún abiertas.
ESTADOS_EN_PROCESO = [
    "Pendiente de contactar",
    "En espera de respuesta",
    "En negociación",
]

# Estado en el que el aporte ya fue recibido.
ESTADO_RECIBIDO = "Donación realizada"

ASIGNACIONES = [
    "Pendiente",
    "Asignado",
]

ASIGNACIONES_DESC = {
    "Pendiente": "El aporte todavía no se ha destinado a ninguna actividad.",
    "Asignado": "Ya se puso a disposición de otro equipo o actividad.",
}
