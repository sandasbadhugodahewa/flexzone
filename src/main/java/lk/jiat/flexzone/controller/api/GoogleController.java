package lk.jiat.flexzone.controller.api;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import lk.jiat.flexzone.dto.GoogleLoginRequestDTO;
import lk.jiat.flexzone.service.UserService;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Path("/google")
public class GoogleController {

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response googleLogin(GoogleLoginRequestDTO request,
                                @Context HttpServletRequest httpRequest) throws GeneralSecurityException, IOException {

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList("1019900974292-365lgalj885a3okfthc7m5ib2i5623u1.apps.googleusercontent.com")).build();

        GoogleIdToken idToken = verifier.verify(request.getToken());
        if (idToken == null) {
            return Response.status(Response.Status.UNAUTHORIZED).entity("{\"status\":false,\"message\":\"Invalid Google Token\"}")
                    .build();
        }

        GoogleIdToken.Payload payload = idToken.getPayload();

        String email = payload.getEmail();
        String firstName = (String) payload.get("given_name");
        String lastName = (String) payload.get("family_name");

        String result = new UserService().googleLogin(email, firstName, lastName, httpRequest);

        return Response.ok(result).type(MediaType.APPLICATION_JSON).build();
    }
}