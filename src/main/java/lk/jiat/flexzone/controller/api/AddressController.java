package lk.jiat.flexzone.controller.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.annotation.IsUser;
import lk.jiat.flexzone.dto.UserAddressDTO;
import lk.jiat.flexzone.dto.UserDTO;
import lk.jiat.flexzone.service.AddressService;
import lk.jiat.flexzone.util.AppUtil;

@Path("/address")
public class AddressController {

    @IsUser
    @GET
    @Path("/loadProvince")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllDepartments() {
        String json = AddressService.getAllProvince();
        return Response.ok().entity(json).build();
    }

    @POST
    @Path("/addAddress")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response saveEmployee(String jsonData, @Context HttpServletRequest request) {
        UserAddressDTO userAddressDTO = AppUtil.GSON.fromJson(jsonData, UserAddressDTO.class);
        String responseJson = new AddressService().addAddress(userAddressDTO, request);
        return Response.ok().entity(responseJson).build();
    }

    @IsUser
    @GET
    @Path("/loadUserAddress")
    @Produces(MediaType.APPLICATION_JSON)
    public Response loadUserAddress(@Context HttpServletRequest request){
        String json = new AddressService().loadUserAddress(request);
        return Response.ok().entity(json).build();
    }

    @PUT
    @Path("/updateAddress")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateAddress(String jsonData, @Context HttpServletRequest request){
        UserAddressDTO dto = AppUtil.GSON.fromJson(jsonData, UserAddressDTO.class);
        String json = new AddressService().updateAddress(dto, request);
        return Response.ok().entity(json).build();
    }

    @DELETE
    @Path("/deleteAddress/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteEmployee(@PathParam("id") int id) {
        String json = new AddressService().deleteEmployee(id);
        return Response.ok().entity(json).build();
    }

}
