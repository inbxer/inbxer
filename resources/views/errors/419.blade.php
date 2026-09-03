@extends('errors::minimal')

@section('title', __('Page Expired'))
@section('code', '419')
@section('message', __('Session expired'))
@section('hint', __('Your session timed out for security reasons. Please try again.'))
