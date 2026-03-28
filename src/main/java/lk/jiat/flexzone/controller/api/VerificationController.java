package lk.jiat.flexzone.controller.api;

import com.google.gson.Gson;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsUser;
import lk.jiat.flexzone.dto.UserDTO;
import lk.jiat.flexzone.service.UserService;

@IsUser
@Path("/verify-accounts")
public class VerificationController {
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response verifyUserAccount(String jsonData) {
        Gson gson = new Gson();
        UserDTO userDTO = gson.fromJson(jsonData, UserDTO.class);
        String responseJson = new UserService().verifyUserAccount(userDTO);
        return Response.ok().entity(responseJson).build();
    }
}

