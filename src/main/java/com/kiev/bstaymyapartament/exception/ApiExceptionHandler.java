
package com.kiev.bstaymyapartament.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.IOException;
import java.util.Objects;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final String INVALID_GUESTS_MESSAGE =
            "A quantidade de hóspedes deve ser de no mínimo 1 e no máximo 4.";

    private static final String INVALID_DATE_FORMAT_MESSAGE =
            "Informe as datas no formato AAAA-MM-DD.";

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(
            ConstraintViolationException exception
    ) {
        String message = exception.getConstraintViolations()
                .stream()
                .map(violation -> violation.getMessage())
                .findFirst()
                .orElse("Os parâmetros informados são inválidos.");

        return badRequest(message);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ProblemDetail handleMethodValidation(
            HandlerMethodValidationException exception
    ) {
        String message = exception.getParameterValidationResults()
                .stream()
                .flatMap(result -> result.getResolvableErrors().stream())
                .map(error -> error.getDefaultMessage())
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("Os parâmetros informados são inválidos.");

        return badRequest(message);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(
            MethodArgumentTypeMismatchException exception
    ) {
        if ("checkIn".equals(exception.getName())
                || "checkOut".equals(exception.getName())) {
            return badRequest(INVALID_DATE_FORMAT_MESSAGE);
        }

        if ("guests".equals(exception.getName())) {
            return badRequest(INVALID_GUESTS_MESSAGE);
        }

        return badRequest("O valor informado para um dos parâmetros é inválido.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(
            IllegalArgumentException exception
    ) {
        return badRequest(exception.getMessage());
    }

    @ExceptionHandler(IOException.class)
    public ProblemDetail handleExternalServiceError(
            IOException exception
    ) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível consultar os preços na BStay. Tente novamente mais tarde."
        );
    }

    @ExceptionHandler(ApartmentUnavailableException.class)
    public ProblemDetail handleApartmentUnavailable(
            ApartmentUnavailableException exception) {

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                exception.getMessage()
        );
    }

    private ProblemDetail badRequest(String message) {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}
